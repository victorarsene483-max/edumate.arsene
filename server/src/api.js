const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
async function apiFetch(path,options={}){
    const res = await fetch(`${API_URL}${path}`,{
        ...options,
        headers: {"content-type":"application/json",...options.headers},
    });
    if(!res.ok){
        throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();

}
export default apiFetch