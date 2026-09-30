export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const id = String(req.query.id || "").trim();

  if (!id || id.length > 100) {
    return res.status(400).json({
      error: "Valid batch ID required."
    });
  }

  const target =
    "https://pwthor.live/study/batches/" +
    encodeURIComponent(id);

  return res.redirect(302, target);
}
