function generateShortLink(reelId, userId) {
    const slug = `${reelId}-${encodeURIComponent(userId)}`;
    const BASE_URL = process.env.BASE_URL || "http://localhost:4000";
    const shortLink = `${BASE_URL}/api/plays/r/${slug}`;
    return { slug, shortLink };
}

module.exports = { generateShortLink };