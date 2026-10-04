const screens = require("./lucent-screen-research.json").filter(screen => !/note-3-mini/i.test(screen.id));

module.exports = function lucentScreensHandler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Use GET to read the Lucent research screen list." });
  }

  try {
    return res.status(200).json({ result: screens });
  } catch {
    return res.status(503).json({ message: "The Lucent research screen list is temporarily unavailable." });
  }
};
