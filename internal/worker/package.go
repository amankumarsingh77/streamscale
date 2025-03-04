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

// This function is kept for backward compatibility but is no longer used
// in the multi-quality implementation
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

	if err := p.packageVideo([]string{fragmentedPath}, outputPath, opts); err != nil {
		return fmt.Errorf("failed to package video: %w", err)
	}

	return nil
}

// stitchSegments is kept for backward compatibility
func (p *videoProcessor) stitchSegments(segments []string, outputPath string) error {
	return p.stitchSegmentsToFile(segments, outputPath)
}

func (p *videoProcessor) fragmentVideo(inputPath, outputPath string) error {
	args := []string{
		"--fragment-duration", "4000",
		"--timescale", "1000",
		inputPath,
		outputPath,
	}

	cmd := exec.Command("mp4fragment", args...)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("mp4fragment failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
}

func (p *videoProcessor) packageVideo(inputPaths []string, outputPath string, opts stitchAndPackageOptions) error {
	args := []string{
		"--output-dir", outputPath,
		"--force",
	}

	// Add format-specific arguments
	if opts.withHLS {
		args = append(args, "--hls")
	}
	// if opts.withDASH {
	// 	args = append(args, "--mpd")
	// }

	// Add input file
	for _, inputPath := range inputPaths {
		args = append(args, inputPath)
	}

	cmd := exec.Command("mp4dash", args...)

	log.Printf("Running mp4dash with args: %v", args)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("mp4dash failed: %v, err: %v", err, string(output))
	}

	// Verify output
	// if err := p.verifyPackagedOutput(outputPath); err != nil {
	// 	return fmt.Errorf("package verification failed: %w", err)
	// }

	return nil
}

func (p *videoProcessor) verifyPackagedOutput(outputPath string) error {
	// Check for essential files
	requiredFiles := []string{
		"master.m3u8", // HLS master playlist
	}

	for _, file := range requiredFiles {
		path := filepath.Join(outputPath, file)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			return fmt.Errorf("required file %s not found in output", file)
		}
	}

	// Check for segment files
	segmentFiles, err := filepath.Glob(filepath.Join(outputPath, "*.ts"))
	if err != nil {
		return fmt.Errorf("failed to check for segment files: %w", err)
	}

	if len(segmentFiles) == 0 {
		// Try looking for DASH segments if no HLS segments found
		dashSegments, err := filepath.Glob(filepath.Join(outputPath, "*.m4s"))
		if err != nil || len(dashSegments) == 0 {
			return fmt.Errorf("no segment files found in output")
		}
	}

	return nil
}
