// 백엔드(FastAPI) 주소. 비밀 키는 절대 넣지 않습니다(공개돼도 되는 주소만).
// 로컬에서 열면 내 PC의 8001 서버, 배포(Vercel)하면 Railway 주소를 씁니다.
window.API_URL = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://127.0.0.1:8001"
  : "https://RAILWAY-주소를-여기에.up.railway.app"; // 배포 후 실제 주소로 바꾸세요 (끝에 / 없이)
