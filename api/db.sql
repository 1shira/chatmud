    CREATE TABLE users (
        username TEXT PRIMARY KEY
    );
CREATE TABLE accounts (
    aId SERIAL PRIMARY KEY,
    account_name TEXT,
    chat_token TEXT,
    chat_token_expires TIMESTAMP
);

CREATE TABLE accounts_have_users (
    aId INTEGER REFERENCES accounts(aid),
    uname TEXT REFERENCES users(username),
    PRIMARY KEY(aid, uname)
);

CREATE TABLE channels (
    channel TEXT PRIMARY KEY
);

CREATE TABLE users_in_channels (
    userId TEXT REFERENCES users(username),
    channel TEXT REFERENCES channels(channel),
    CONSTRAINT uic_pk PRIMARY KEY (userid,channel)
);

CREATE TABLE messages (
    mId TEXT PRIMARY KEY,
    t TIMESTAMP NOT NULL,
    from_user TEXT REFERENCES users(username) NOT NULL,
    msg TEXT NOT NULL,
    is_join BOOLEAN DEFAULT false,
    is_leave BOOLEAN DEFAULT false,
    channel TEXT REFERENCES channels(channel),
    to_user TEXT REFERENCES users(username),
    CONSTRAINT has_one_dest CHECK (
        (channel IS NOT NULL AND to_user IS NULL) OR
        (channel IS NULL AND to_user IS NOT NULL)
    )
);  