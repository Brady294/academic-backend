/*
|--------------------------------------------------------------------------
| ADMIN USERS
|--------------------------------------------------------------------------
|
| GET /api/admin/users
|
| Requires:
| 1. Authentication
| 2. Admin privileges
|
| Supports:
| - Search
| - Pagination
| - Student/admin filtering
|
|--------------------------------------------------------------------------
*/

router.get("/users", auth, admin, async (req, res) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        parseInt(req.query.limit, 10) || 10,
        1
      ),
      100
    );

    const offset = (page - 1) * limit;

    const search = String(
      req.query.search || ""
    ).trim();

    const role = String(
      req.query.role || "all"
    ).trim().toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | BUILD FILTERS
    |--------------------------------------------------------------------------
    */

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          CAST(id AS TEXT) ILIKE $${values.length}
          OR name ILIKE $${values.length}
          OR email ILIKE $${values.length}
          OR first_name ILIKE $${values.length}
          OR last_name ILIKE $${values.length}
          OR phone ILIKE $${values.length}
        )
      `);
    }

    if (role === "student") {
      conditions.push("is_admin = false");
    }

    if (role === "admin") {
      conditions.push("is_admin = true");
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    /*
    |--------------------------------------------------------------------------
    | TOTAL USERS
    |--------------------------------------------------------------------------
    */

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM users
        ${whereClause}
      `,
      values
    );

    const total =
      Number(countResult.rows[0]?.total || 0);

    /*
    |--------------------------------------------------------------------------
    | USERS
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | We intentionally DO NOT return:
    | - password
    | - verification_code
    | - verification_code_expires
    | - reset_token
    | - reset_token_expires
    |
    |--------------------------------------------------------------------------
    */

    const usersResult = await pool.query(
      `
        SELECT
          id,
          name,
          email,
          first_name,
          last_name,
          phone,
          country,
          timezone,
          university,
          academic_level,
          avatar,
          is_admin,
          is_verified,
          created_at
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
      `,
      [
        ...values,
        limit,
        offset,
      ]
    );

    const totalPages =
      Math.max(
        Math.ceil(total / limit),
        1
      );

    return res.json({
      success: true,

      users: usersResult.rows,

      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN USERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to load users.",
    });
  }
});