const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

export async function getExternalIds(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  tmdbToken: string
): Promise<{imdb_id: string | null}> {
  try {
    const response = await fetch(
      `${TMDB_API_BASE_URL}/${mediaType}/${tmdbId}/external_ids`,
      {
        headers: {
          Authorization: `Bearer ${tmdbToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Failed to fetch external IDs from TMDB. Status: ${response.status}, Body: ${errorBody}`
      );
      return {imdb_id: null};
    }
    const data = await response.json();
    return {imdb_id: data.imdb_id};
  } catch (error) {
    console.error('Error fetching external IDs from TMDB:', error);
    return {imdb_id: null};
  }
}
