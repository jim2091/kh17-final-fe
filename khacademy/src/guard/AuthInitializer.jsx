import { useAtomValue } from "jotai";
import { isLoginState } from "../utils/storage";
import { useEffect, useState } from "react";
import { apiClient } from "../utils/reaxios";

export default function AuthInitializer({children}) {
    const isLogin = useAtomValue(isLoginState);

    //초기 인증 확인이 끝났는지 여부
    const [authReady, setAuthReady] = useState(false);

    useEffect(()=>{

        const checkAuth = async () => {
            
            //프론트에서도 로그인 정보가 없다면
            //서버 인증 확인할 필요도 없음
            if(!isLogin) {
                setAuthReady(true);
                return;
            }
    
            //loacalStorage에 로그인 정보 있으니까 서버 인증상태 확인
            setAuthReady(false);
    
            try {
                await apiClient.get("/auth/check");
            }
            catch(error) {
                //401이라면 apiClient의 interceptor에서 refresh 및 로그아웃 처리 수행할거
                console.log("초기 인증 확인 실패", error)
            }
            finally {
                setAuthReady(true);
            }
        };

        checkAuth();

    }, [isLogin]);

    //인증 확인 중에는 하위 컴포넌트를 만들지 않음
    if(!authReady) {
        return null;
    }

    return children;

}