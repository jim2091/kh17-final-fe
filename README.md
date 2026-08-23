# kh17-final-fe

## 프론트엔드 개발시 유의

- 공통 화면은 MainLayout으로 구성돼요
- 프로젝트 내부 화면은 ProjectLayout으로 구성돼요
- 각자 맡으신 기능별 화면은 components/{기능명} 아래에서 구현하시면 됩니다
- Header / Sidebar / ProjectTabs 같은 템플릿들 세미때처럼 각 페이지에서 다시 불러오지 않아도 돼요
- 공통 template 수정 시 팀원에게 반드시 공유해주기

## 프로젝트 내부 URL

/projects/:projectNo/task
/projects/:projectNo/chat
/projects/:projectNo/calendar
/projects/:projectNo/notes
/projects/:projectNo/files
/projects/:projectNo/records

- 