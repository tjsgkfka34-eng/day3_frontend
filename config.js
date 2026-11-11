// 백엔드(FastAPI) 주소. 비밀 키는 절대 넣지 않습니다(공개돼도 되는 주소만).
// 로컬에서 열면 내 PC의 8001 서버, 배포(Vercel)하면 Railway 주소를 씁니다.
window.API_URL = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://127.0.0.1:8001"
  : "https://day3backend-production-49985cd7.up.railway.app"; // Railway 백엔드 주소 (끝에 / 없이)
