import { EnemyMgr, Player } from "./playerController";

declare var TokenMsg: (arg0: number) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var MoveMsg: (arg0: number) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var ShotMsg: (arg0: number) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var HeartMsg: () => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var DirectMsg: (arg0: number) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var blob2string: (arg0: any) => string;

enum GameState { Match = 0, Start = 1, End = 2 }

export class Web {
    private _ip: string = "192.168.96.165:9001";
    private _ws!: WebSocket;
    private _pmap!: EnemyMgr;
    private _me!: Player;
    private _timerCmd: NodeJS.Timeout | null = null;
    private _timerHeart: NodeJS.Timeout | null = null;
    private _gameStat: GameState = GameState.Match;
    private _gameLeftTime: number = 999;

    constructor() {
    }

    public IsGameStart(): boolean {
        return this._gameStat == GameState.Start;
    }

    public IsGameEnd(): boolean {
        return this._gameStat == GameState.End;
    }

    public UpdateP(p: EnemyMgr, m: Player) {
        this._me = m;
        this._pmap = p;
        this._timerCmd = setInterval((me) => {
            if (typeof (me) == 'undefined')
                return;

            if (me.isMove())
                this.SendMoveMsg(me.getDirect());
            if (me.isShot())
                this.SendShotMsg(me.getShotDirect());
            this.SendDirectMsg(me.getShotDirect());
        }, 50, this._me);


        this._timerHeart = setInterval((me) => {
            this.SendHeartMsg();
        }, 500, this._me);
    }

    public InitWS() {
        this._ws = new WebSocket("ws://" + this._ip);
        this._ws.binaryType = "arraybuffer";

        this._ws.onopen = () => {
            this.SendTokenMsg(1);
            console.log("WebScoket Opened!");
        };

        this._ws.onmessage = async (evt) => {
            let received_msg = evt.data.slice(4);
            var data = JSON.parse(blob2string(received_msg));
            if (typeof (data.users) != 'undefined') {
                this._gameStat = GameState.Start;

                if (typeof (this._me) == 'undefined' || typeof (this._pmap) == 'undefined')
                    return;

                this._me.mUpdate(data.users[0].X, data.users[0].Y, data.users[0].Hp);
                if (data.users.length > 1) {
                    for (var i = 1; i < data.users.length; i++) {
                        var tt = data.users[i];
                        if (tt.Id == data.users[0].Id)
                            continue;
                        this._pmap.Add(tt.Id, tt.X, tt.Y, tt.Hp, tt.Ag);
                    }
                }
            }
            if (typeof (data.outter) != 'undefined') {

            }
            if (typeof (data.time) != 'undefined') {
                this._gameLeftTime = data.time;
            }
            if (typeof (data.bullets) != 'undefined' && data.bullets != null) {
                let bList = [];
                if (data.bullets.length > 0) {
                    for (var i = 0; i < data.bullets.length; i++) {
                        var tt = data.bullets[i];
                        bList.push(tt.Id);
                        this._pmap.AddBullet(tt.Id, tt.Pos.X, tt.Pos.Y);
                    }
                }
                this._pmap.DelLastBullets(bList);
            }

            if (typeof (data.bullets) != 'undefined' && data.bullets == null) {
                this._pmap.DelLastBullets([]);
            }

            if (typeof (data.end) != 'undefined') {
                this._gameStat = GameState.End;

            }
        };

        this._ws.onclose = () => {
            clearInterval(Number(this._timerCmd));
            clearInterval(Number(this._timerHeart));
            console.log("WebScoket Closed!");
        };
    }

    public SendTokenMsg(id: number) {
        this._ws.send(TokenMsg(id));
    }

    public SendMoveMsg(direct: number) {
        if (this._ws.OPEN)
            this._ws.send(MoveMsg(direct));
    }

    public SendHeartMsg() {
        if (this._ws.OPEN)
            this._ws.send(HeartMsg());
    }

    public SendShotMsg(direct: number) {
        if (this._ws.OPEN)
            this._ws.send(ShotMsg(direct));
    }

    public SendDirectMsg(direct: number) {
        if (this._ws.OPEN)
            this._ws.send(DirectMsg(direct));
    }

    public CloseWS() {
        this._ws.close();
    }

    public GetLeftTime():number {
        return this._gameLeftTime;
    }

}
