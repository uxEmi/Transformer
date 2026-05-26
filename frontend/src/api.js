import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 60000, // generation can be slow on CPU
});

export async function fetchSeeds() {
  const { data } = await API.get("/seeds");
  return data.seeds;
}

export async function generate({
  seedId,
  temperature = 0.8,
  maxNewTokens = 50,
  sampling = "top_p",
  topK = 40,
  topP = 0.9,
}) {
  const { data } = await API.post("/generate", {
    seed_id: seedId,
    temperature,
    max_new_tokens: maxNewTokens,
    sampling,
    top_k: topK,
    top_p: topP,
  });
  return data;
}

export async function fetchBpePatterns() {
  const { data } = await API.get("/bpe-patterns");
  return data.patterns;
}
