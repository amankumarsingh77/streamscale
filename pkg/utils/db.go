package utils

//func BuildListQuery(userID uuid.UUID, filter *models.FilterOptions, query *Pagination) (string, []interface{}) {
//	var args []interface{}
//	var conditions []string
//
//	args = append(args, userID)
//	conditions = append(conditions, "v.user_id = $1")
//
//	if filter != nil {
//		if filter.Status != "" {
//			args = append(args, filter.Status)
//			conditions = append(conditions, fmt.Sprintf("v.status = $%d", len(args)))
//		}
//		if filter.StartDate != "" {
//			args = append(args, filter.StartDate)
//			conditions = append(conditions, fmt.Sprintf("v.created_at >= $%d", len(args)))
//		}
//		if filter.EndDate != "" {
//			args = append(args, filter.EndDate)
//			conditions = append(conditions, fmt.Sprintf("v.created_at <= $%d", len(args)))
//		}
//	}
//	whereClause := strings.Join(conditions, " AND")
//	var orderBy string
//	if query.OrderBy != "" {
//		orderBy = query.OrderBy
//	} else {
//		orderBy = "v.uploaded_at DESC"
//	}
//
//	queryStr := fmt.Sprintf(`
//	WHERE %s
//	ORDER BY %s
//	LIMIT $%d OFFSET $%d`,
//		whereClause, orderBy, len(args)+1, len(args)+2)
//	args = append(args, query.GetLimit(), query.GetOffset())
//
//	return queryStr, args
//}
