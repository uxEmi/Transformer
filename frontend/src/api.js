import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 300000,
});

export async function generate({
  file,
  temperature = 0.8,
  maxNewTokens = 50,
  sampling = "top_p",
  topK = 40,
  topP = 0.9,
}) {
  const form = new FormData();
  form.append("file", file);
  form.append("temperature", String(temperature));
  form.append("max_new_tokens", String(maxNewTokens));
  form.append("sampling", sampling);
  form.append("top_k", String(topK));
  form.append("top_p", String(topP));

  const { data } = await API.post("/generate", form);
  return data;
}
