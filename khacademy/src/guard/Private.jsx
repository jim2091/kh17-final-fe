
//이 도구는 특정 화면(컴포넌트)에 덧씌워서 입장 검사를 수행하는 도구 
//예를 들어 화면이 <MyPage>면 -> <Private><MyPage></Private>형태로 만들어서 사용
//속성이 아니라 화면 코드가 내부로 전달될 수 있다(jquery에선... text()또는 html()이라 부른다. 내부컨텐츠)

import { useAtomValue } from "jotai";
import { isAdminState, isLoginState } from "@utils/storage";
import NotAuthorization from "@error/NotAuthorization";
import NeedPermission from "@error/NeedPermission";

//React Component에서는 전달된 내부 컨텐츠를 children이란 이름으로 접근할 수 있다.
export default function Private({children}){
    // console.log("private guard 통과!");

    //jotai에 저장된 값을 불러와서 자격을 검사한다. 
    const isLogin = useAtomValue(isLoginState);
    const isAdmin = useAtomValue(isAdminState);
    //console.log("isLogin", isLogin, "isAdmin", isAdmin);

    if(isLogin !== true){//로그인 상태가 아니라면
        return (
        <NotAuthorization/>
    );
    }

    if(isAdmin === true){
        return (<><NeedPermission/></>);
    }
    return children;

}