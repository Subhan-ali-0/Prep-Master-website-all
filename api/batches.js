const BATCHES_URL =
  "https://rarestudy.github.io/rarestudy/batches.json";

function findArray(value, depth = 0) {
  if (depth > 7 || value == null) return [];

  if (Array.isArray(value)) {
    if (value.length && typeof value[0] === "object") {
      return value;
    }

    for (const item of value) {
      const found = findArray(item, depth + 1);
      if (found.length) return found;
    }

    return value;
  }

  if (typeof value === "object") {
    for (const key of [
      "batches", "data", "results", "courses", "items", "payload"
    ]) {
      if (key in value) {
        const found = findArray(value[key], depth + 1);
        if (found.length) return found;
      }
    }

    for (const item of Object.values(value)) {
      const found = findArray(item, depth + 1);
      if (found.length) return found;
    }
  }

  return [];
}

function first(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return value;
    }
  }

  return "";
}

function normalizeBatch(batch, index) {
  return {
    id: String(first(batch, [
      "id", "_id", "batch_id", "batchId",
      "course_id", "courseId", "slug"
    ]) || ""),
    title: String(first(batch, [
      "name", "title", "batch_name", "batchName",
      "course_name", "courseName"
    ]) || `Batch ${index + 1}`),
    image: String(first(batch, [
      "image", "thumbnail", "banner", "cover",
      "image_url", "thumbnail_url", "banner_url"
    ]) || ""),
    description: String(first(batch, [
      "description", "subtitle", "details"
    ]) || "")
  };
}

export default async function handler(req, res) {
  res.setHeader(
    "Cache-Control",
    "s-maxage=300, stale-while-revalidate=600"
  );

  try {
    const response = await fetch(BATCHES_URL);

    if (!response.ok) {
      throw new Error(`Batch source error: ${response.status}`);
    }

    const raw = await response.json();
    const rows = findArray(raw);

    const batches = rows
      .map(normalizeBatch)
      .filter(batch => batch.id || batch.title);

    return res.status(200).json({ batches });
  } catch (error) {
    console.error("Batches API:", error.message);

    return res.status(502).json({
      error: "Batches load nahi ho paaye."
    });
  }
}
