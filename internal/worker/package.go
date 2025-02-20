package worker

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

type stitchAndPackageOptions struct {
	segmentDuration int
	withHLS         bool
	withDASH        bool
}

func (p *videoProcessor) stitchAndPackage(segments []string, outputPath string) error {
	// Create temporary directory for packaged output
	packagingDir := filepath.Join(p.tempDir, "packaging")
	if err := os.MkdirAll(packagingDir, 0755); err != nil {
		return fmt.Errorf("failed to create packaging directory: %w", err)
	}
	defer os.RemoveAll(packagingDir) // Cleanup after upload

	// Step 1: Stitch segments together
	stitchedPath := filepath.Join(packagingDir, "stitched.mp4")
	if err := p.stitchSegments(segments, stitchedPath); err != nil {
		return fmt.Errorf("failed to stitch segments: %w", err)
	}

	// Step 2: Fragment the stitched video
	fragmentedPath := filepath.Join(packagingDir, "fragmented.mp4")
	if err := p.fragmentVideo(stitchedPath, fragmentedPath); err != nil {
		return fmt.Errorf("failed to fragment video: %w", err)
	}

	// Step 3: Package the video with HLS/DASH
	opts := stitchAndPackageOptions{
		segmentDuration: 6,
		withHLS:         true,
		withDASH:        true,
	}

	if err := p.packageVideo(fragmentedPath, outputPath, opts); err != nil {
		return fmt.Errorf("failed to package video: %w", err)
	}

	return nil
}

func (p *videoProcessor) stitchSegments(segments []string, outputPath string) error {
	// Create concat file
	concatListPath := filepath.Join(p.tempDir, "concat_list.txt")
	concatFile, err := os.Create(concatListPath)
	if err != nil {
		return fmt.Errorf("failed to create concat list: %w", err)
	}
	defer os.Remove(concatListPath)
	defer concatFile.Close()

	// Write segment paths to concat file
	for _, segment := range segments {
		absPath, err := filepath.Abs(segment)
		if err != nil {
			return fmt.Errorf("failed to get absolute path for segment: %w", err)
		}
		if _, err := fmt.Fprintf(concatFile, "file '%s'\n", absPath); err != nil {
			return fmt.Errorf("failed to write to concat list: %w", err)
		}
	}
	concatFile.Close() // Close before using in ffmpeg

	// Run ffmpeg concat
	cmd := exec.Command("ffmpeg",
		"-f", "concat",
		"-safe", "0",
		"-i", concatListPath,
		"-c", "copy",
		"-movflags", "+faststart",
		"-y", outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg concat failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
}

func (p *videoProcessor) fragmentVideo(inputPath, outputPath string) error {
	cmd := exec.Command("mp4fragment",
		"--fragment-duration", "4000",
		"--timescale", "1000",
		inputPath,
		outputPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("mp4fragment failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
}

func (p *videoProcessor) packageVideo(inputPath, outputPath string, opts stitchAndPackageOptions) error {
	args := []string{
		"--output-dir", outputPath,
		"--force",
	}

	// Add format-specific arguments
	if opts.withHLS {
		args = append(args, "--hls")
	}
	//if opts.withDASH {
	//	args = append(args, "--mpd")
	//}

	// Add input file
	args = append(args, inputPath)

	cmd := exec.Command("mp4dash", args...)

	log.Println(args)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("mp4dash failed: %v, err: %v", err, string(output))
	}

	// Verify output
	//if err := p.verifyPackagedOutput(outputPath); err != nil {
	//	return fmt.Errorf("package verification failed: %w", err)
	//}

	return nil
}

func (p *videoProcessor) verifyPackagedOutput(outputPath string) error {
	// Check for essential files
	requiredFiles := []string{
		"stream.mpd",  // DASH manifest
		"master.m3u8", // HLS master playlist
	}

	for _, file := range requiredFiles {
		path := filepath.Join(outputPath, file)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			return fmt.Errorf("required file %s not found in output", file)
		}
	}

	// Check for segment files
	segmentFiles, err := filepath.Glob(filepath.Join(outputPath, "chunk-*.m4s"))
	if err != nil {
		return fmt.Errorf("failed to check for segment files: %w", err)
	}

	if len(segmentFiles) == 0 {
		return fmt.Errorf("no segment files found in output")
	}

	return nil
}
