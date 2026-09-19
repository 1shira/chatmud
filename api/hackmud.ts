import axios from 'axios';
import type { AxiosResponse } from 'axios';
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 86400 })

type chatPass = string & { length: 5 }
interface Message {
    id: string;
    "t": number,
    "from_user": string,
    "msg": string
    "is_join"?: true,
    "is_leave"?: true,
    "channel"?: "0000",
    "recieved_by"?: string,
}

type ErrorResponses =
    { code: "E_INV_PASS" }
    | { code: "E_INV_TOKEN" }
    | { code: "E_CONN_TO" }
    | { code: "E_UNH_RESCODE", info: { rescode: number, resdata: object } }
    | { code: "E_UNH_RES", info: object }
    | { code: "E_UNX_RES", info: object }
    | { code: "E_THROWABLE", info: object }



type chatAPIReturn = {
    ok: true,
    chats: { [K in string]: Message[] }
} | { ok: false }

type FailureResponse = { ok: false } & ErrorResponses

async function sendPostRequest<T>(url: string, body: T):
    Promise<
        { ok: true, res: AxiosResponse<any, T, {}, any> } |
        FailureResponse> {
    try {
        const res = await axios.post(url, body);
        return { ok: true, res };
    } catch (e: any) {

        if (e.code === "ECONNABORTED") return { ok: false, code: "E_CONN_TO" }

        return { ok: false, code: "E_THROWABLE", info: e }
    }
}

const getChatToken = async (chat_pass: chatPass):
    Promise<
         { ok: true, chat_token: string }
         | FailureResponse
    > => {
    const _res = await sendPostRequest('https://hackmud.com/mobile/get_token.json', { pass: chat_pass }) // ratelimit?
    if (_res.ok !== true) return _res;
    const res = _res.res
    if (res.status === 403) return { ok: false, code: "E_INV_PASS" }
    if (res.status !== 200) {
        return { ok: false, code: "E_UNH_RESCODE", info: { rescode: res.status, resdata: res.data } }
    }

    if ("ok" in res.data) return res.data;

    console.log(JSON.stringify(res.data));
    return { ok: false, code: "E_UNX_RES", info: res.data }
}

const getAccountDetails = async (token: string):
    Promise<
        { ok: false, code: string, info?: object } |
        { ok: true, users: string[], channels: string[] }
    > => {
    const _res = await sendPostRequest('https://hackmud.com/mobile/account_data.json', { chat_token: token }) // ratelimit?
    if (_res.ok !== true) return _res;
    const res = _res.res
    if (res.status === 401) return { ok: false, code: "E_INV_TOKEN" }
    if (res.status !== 200) {
        return { ok: false, code: "E_UNH_RESCODE", info: { rescoe: res.status, resdata: res.data } }
    }

    if (res.data.ok === true) {
        const users = Object.keys(res.data.users);
        const channels: Set<string> = new Set();
        for (let u of users) {
            let c = Object.keys(res.data.users[u]);
            for (let chan of c) {
                channels.add(chan);

                //TODO maybe save/update who is in which channel when we're getting this anyways

            }
        }

        return { ok: true, users, channels: [...channels] }

    } else if (res.data.ok === false) {
        return { ok: false, code: "E_UNH_RES", info: res.data }
    };

    console.log(JSON.stringify(res.data));
    return { ok: false, code: "E_UNX_RES", info: res.data }
}


const getChats = async (token: string, since: Date, users: string[]):
    Promise<
        { ok: true, messages: Message[] }
        | FailureResponse
    > => {
    if ((cache.get("ratelimit_chats") as number || 0) > Date.now() - 2500) return { ok: false, code: "E_RATELIMIT" }

    cache.set("ratelimit_chats", Date.now())
    const _res = await sendPostRequest('https://hackmud.com/mobile/chats.json',
        {
            chat_token: token,
            usernames: users,
            after: Math.floor(since.valueOf() / 1000)
        })
    if (_res.ok !== true) return _res;
    const res = _res.res
    if (res.status === 401) return { ok: false, code: "E_INV_TOKEN" }
    if (res.status !== 200) {
        return { ok: false, code: "E_UNH_RESCODE", info: { rescode: res.status, resdata: res.data } }
    }

    const ret = res.data as chatAPIReturn

    if (ret.ok === true) {
        let u = Object.keys(ret.chats);
        if (u.some((el) => !users.includes(el))) {
            console.log("wtf happened? - recieved messages we did not request")
        }
        if (users.some((el) => !u.includes(el))) {
            console.log("did not get messages for all requested users")
            // don't know if this happens when a user has no msgs to read
            // or if we don't have access to that users (or if that returns non-200)
        }

        let messages = [];
        for (let usr of u) {
            if (ret.chats[usr].length === 0) continue;
            ret.chats[usr].forEach(el => el.recieved_by = usr)
            messages.push(...res.data.chats[usr]);
        }

        return { ok: true, messages }

    } else if (ret.ok === false) {
        return { ok: false, code: "E_UNH_RES", info: res.data }
    };

    console.log(JSON.stringify(res.data));
    return { ok: false, code: "E_UNX_RES", info: res.data }
}

export {
    getChatToken,
    getAccountDetails,
    getChats,
}