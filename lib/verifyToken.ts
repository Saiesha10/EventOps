const jwt=require( "jsonwebtoken");

export function verifyToken(req: Request) {
  const token = req.headers.get("cookie")?.split("token=")[1];

  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
}
