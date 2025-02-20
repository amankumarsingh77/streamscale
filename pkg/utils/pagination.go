package utils

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"math"
	"strconv"
)

type Pagination struct {
	Page    int    `json:"page"`
	Size    int    `json:"count"`
	OrderBy string `json:"order_by"`
}

const (
	defaultSize = 10
)

func (p *Pagination) SetSize(querySize string) error {
	if querySize == "" {
		p.Size = defaultSize
		return nil
	}
	size, err := strconv.Atoi(querySize)
	if err != nil {
		return fmt.Errorf("invalid size: %w", err)
	}
	p.Size = size
	return nil
}

func (p *Pagination) SetPage(queryPage string) error {
	if queryPage == "" {
		p.Page = 0
		return nil
	}
	page, err := strconv.Atoi(queryPage)
	if err != nil {
		return fmt.Errorf("invalid page: %w", err)
	}
	p.Page = page
	return nil
}

func (p *Pagination) SetOrderBy(queryOrder string) {
	p.OrderBy = queryOrder
}

func (p *Pagination) GetSize() int {
	return p.Size
}

func (p *Pagination) GetPage() int {
	return p.Page
}

func (p *Pagination) GetOrderBy() string {
	return p.OrderBy
}

func (p *Pagination) GetOffset() int {
	if p.Page == 0 {
		return 0
	}
	return (p.Page - 1) * p.Size
}

func (p *Pagination) GetLimit() int {
	return p.Size
}

func (p *Pagination) GetQueryString() string {
	return fmt.Sprintf("page=%v&size=%v&orderBy=%v", p.Page, p.Size, p.OrderBy)
}

func GetPaginationFromCtx(ctx echo.Context) (*Pagination, error) {
	p := &Pagination{}

	if err := p.SetSize(ctx.QueryParam("size")); err != nil {
		return nil, err
	}
	if err := p.SetPage(ctx.QueryParam("page")); err != nil {
		return nil, err
	}
	p.SetOrderBy(ctx.QueryParam("orderBy"))
	return p, nil
}

func GetTotalPages(totalCount int, pageSize int) int {
	d := float64(totalCount) / float64(pageSize)
	return int(math.Ceil(d))
}

func GetHasMore(currPage, totalCount, pageSize int) bool {
	return currPage*pageSize < totalCount
}
