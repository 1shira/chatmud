interface Message {
    id: string;
    "t": number,
    "from_user": string,
    "msg": string
    "is_join"?: true,
    "is_leave"?: true,
    "channel"?: "0000",
    "to_user"?: string,
}