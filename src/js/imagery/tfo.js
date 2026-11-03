export const TFO_MOSAIC_PREFIX = "planet_medres_normalized_analytic_";

export const tfoLabel = (mosaic = "") =>
  mosaic.startsWith(TFO_MOSAIC_PREFIX)
    ? mosaic.slice(TFO_MOSAIC_PREFIX.length).replace(/_mosaic$/, "")
    : mosaic;

export const resolveTfoTime = (time, mosaics) => {
  if (!mosaics || mosaics.length === 0) return time;
  if (!time || time === "newest") return mosaics[0];
  if (mosaics.includes(time)) return time;
  const expanded = `${TFO_MOSAIC_PREFIX}${time}_mosaic`;
  return mosaics.includes(expanded) ? expanded : mosaics[0];
};

const parseBody = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const readMosaics = async (response) => {
  if (response.ok) return response.json();
  const body = parseBody(await response.text().catch(() => ""));
  throw new Error(
    (typeof body === "string" && body) || `Unable to load TFO dates (HTTP ${response.status}).`
  );
};

export const fetchTfoMosaics = (imageryId) =>
  fetch(`/get-tfo-dates?imageryId=${imageryId}`).then(readMosaics);

export const fetchTfoMosaicsForToken = (accessToken) =>
  fetch("/get-tfo-dates-for-token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  }).then(readMosaics);
