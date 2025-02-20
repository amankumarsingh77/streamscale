package repository

const (
	createUser = `INSERT INTO users (fullname, email, password,username, role, api_key,created_at, updated_at)
						VALUES ($1, $2, $3, $4, COALESCE(NULLIF($5, ''), 'user')::user_role, $6, now(), now()) 
						RETURNING *`
	updateUser = `UPDATE users 
						SET fullname = COALESCE(NULLIF($1, ''), fullname),
						    email = COALESCE(NULLIF($2, ''), email),
						    role = COALESCE(NULLIF($3, ''), role),
						    updated_at = now()
						WHERE user_id = $4
						RETURNING *
				`
	deleteUserQuery = `DELETE FROM users WHERE user_id = $1`

	getUserQuery = `SELECT user_id, fullname,username, email, role, created_at, updated_at  
					 FROM users 
					 WHERE user_id = $1`
	getUserByEmail = `SELECT user_id , fullname, username ,password, email, role, api_key, storage_quota_db, created_at, updated_at
						FROM users WHERE email = $1`
	//getTotalCount = "SELECT COUNT(id) FROM users WHERE first_name ILIKE '%' || $1 || '%' or last_name ILIKE '%' || $1 || '%' "
	createApiKey         = "UPDATE users SET api_key = $1 WHERE user_id = $2"
	getStorageUsageQuery = `SELECT user_id, SUM(file_size) as total_size FROM video_files WHERE user_id = $1 GROUP BY user_id`
)
