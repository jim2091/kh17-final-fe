import { atom } from "jotai";
import { atomWithStorage, createJSONStorage, RESET} from "jotai/utils";

//로컬스토리지를 JSON 스토리지로 생성
const localStorageWrapper = createJSONStorage(()=>window.localStorage);

//로그인한 사용자 정보
export const loginUserState = atomWithStorage("loginUserState", null, localStorageWrapper);

//로그인 여부
export const isLoginState = atom(get=>{
    const loginUser = get(loginUserState);
    return loginUser !== null;
});

//관리자 여부
export const isAdminState = atom(get=>{
    const loginUser = get(loginUserState);
    //데이터명/값 임의로 넣어뒀어요 권한 담당자분 여기 적절히 바꿔주셔야 함
    return loginUser?.empLevel === "admin";
});

//로그인 처리
export const loginActionState = atom(null, (get, set, data) =>{
    set(loginUserState, data);
});
//로그아웃 처리
export const logoutActionState = atom(null, (get, set) => {
    set(loginUserState, RESET)
})

//Access Token
export const accessTokenState = atom(null);

loginUserState.debugLabel = "로그인 유저의 정보";
isLoginState.debugLabel = "로그인 상태";
isAdminState.debugLabel = "관리자 여부";

