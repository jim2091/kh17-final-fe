import { useAtomValue } from "jotai";
import { isAdminState, isLoginState } from "@utils/storage";
import NeedPermission from "@error/NeedPermission";
import NotAuthorized from "../error/NotAuthorized";


export default function Admin({children}){

    const isLogin = useAtomValue(isLoginState);
    const isAdmin = useAtomValue(isAdminState);

    if(isLogin !== true){
        return(<NotAuthorized/>)
    }
    if(isAdmin !== true){
        return(<><NeedPermission/></>)
    }
    return children;
}