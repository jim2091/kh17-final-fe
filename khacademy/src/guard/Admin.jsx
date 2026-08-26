import { useAtomValue } from "jotai";
import { isAdminState, isLoginState } from "@utils/storage";
import NotAuthorization from "@error/NotAuthorization";
import NeedPermission from "@error/NeedPermission";


export default function Admin({children}){

    const isLogin = useAtomValue(isLoginState);
    const isAdmin = useAtomValue(isAdminState);

    if(isLogin !== true){
        return(<NotAuthorization/>)
    }
    if(isAdmin !== true){
        return(<><NeedPermission/></>)
    }
    return children;
}