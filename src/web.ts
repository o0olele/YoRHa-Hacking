import { EnemyMgr, Player } from "./playerController";
import * as axios from "axios"

declare var TokenMsg: (arg0: number, arg1: string) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var MoveMsg: (arg0: number) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var ShotMsg: (arg0: number) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var HeartMsg: () => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var DirectMsg: (arg0: number) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var blob2string: (arg0: any) => string;

enum GameState { Match = 0, Start = 1, End = 2 }

export class Web {
    private _http: string = "http://192.168.96.165";
    private _ip: string = "192.168.96.165:9001";
    private _ws!: WebSocket;

    // Player - related
    private _id!: number;
    private _name!: string;
    private _token!: string;

    // Game - related
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
            this.SendTokenMsg(this._id, this._token);
            console.log("WebScoket Opened!");
        };

        this._ws.onmessage = async (evt) => {
            let received_msg = evt.data.slice(4);
            var data = JSON.parse(blob2string(received_msg));
            console.log(data);

            //--------------------------------------------------------------------------------------------
            // master version
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
                for (var i = 0; i < data.outter.length; i++) {
                    this._pmap.Del(data.outter[i]);
                }
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


            //--------------------------------------------------------------------------------------------
            // rebuild version
            if (typeof (data.Move) != 'undefined') {
                if (typeof (this._me) == 'undefined' || typeof (this._pmap) == 'undefined')
                    return;

                for (var i = 0; i < data.Move.length; i++) {
                    var tt = data.Move[i];

                    if (this._id == tt.Userid) {
                        this._me.mUpdate(tt.Pos.X, tt.Pos.Y, tt.Hp);
                        continue;
                    }
                    this._pmap.Add(tt.Userid, tt.Pos.X, tt.Pos.Y, tt.Hp, tt.Pos.Ag);
                }
            }

            if (typeof (data.ReMove) != 'undefined') {
                for (var i = 0; i < data.ReMove.length; i++) {
                    this._pmap.Del(data.ReMove[i].Userid);
                }
            }

            if (typeof (data.Add) != 'undefined') {
                this._gameStat = GameState.Start;

                if (typeof (this._me) == 'undefined' || typeof (this._pmap) == 'undefined')
                    return;

                for (var i = 0; i < data.Add.length; i++) {
                    var tt = data.Add[i];

                    if (this._id == tt.Userid) {
                        this._me.mUpdate(tt.Pos.X, tt.Pos.Y, tt.Hp);
                        continue;
                    }
                    this._pmap.Add(tt.Userid, tt.Pos.X, tt.Pos.Y, tt.Hp, tt.Pos.Ag);
                }
                console.log(this._id, this._pmap);
            }

            if (typeof (data.Bullets) != 'undefined') {
                if (typeof (data.Bullets.Add) != 'undefined' && data.Bullets.Add != null) {
                    for (var i = 0; i < data.Bullets.Add.length; i++) {
                        var tt = data.Bullets.Add[i];
                        this._pmap.AddBullet(tt.Id, tt.Pos.X, tt.Pos.Y);
                    }
                }

                if (typeof (data.Bullets.Move) != 'undefined' && data.Bullets.Move != null) {
                    for (var i = 0; i < data.Bullets.Move.length; i++) {
                        var tt = data.Bullets.Move[i];
                        this._pmap.AddBullet(tt.Id, tt.Pos.X, tt.Pos.Y);
                    }
                }

                if (typeof (data.Bullets.ReMove) != 'undefined' && data.Bullets.ReMove != null) {
                    for (var i = 0; i < data.Bullets.ReMove.length; i++) {
                        var tt = data.Bullets.ReMove[i];
                        this._pmap.DelBullet(tt);
                    }
                }
            }

            if (typeof (data.End) != 'undefined') {
                this._gameStat = GameState.End;

            }

            if (typeof (data.Time) != 'undefined') {
                this._gameLeftTime = data.Time;
            }
        };

        this._ws.onclose = () => {
            clearInterval(Number(this._timerCmd));
            clearInterval(Number(this._timerHeart));
            console.log("WebScoket Closed!");
        };
    }

    public SendTokenMsg(id: number, token: string) {
        this._ws.send(TokenMsg(id, token));
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

    public GetLeftTime(): number {
        return this._gameLeftTime;
    }

    // /getid?DeviceId=xxx&Ip=xxx
    public async HttpGetID() {
        try {
            const response = await axios.default.get(this._http + "/getname?DeviceId=00000&" + "Ip=" + location.port);
            this._id = response.data.Id;
            this._name = response.data.Name;
        } catch (exception) {
            process.stderr.write(`ERROR received from ${this._http}: ${exception}\n`);
        }
    }

    // /getname?Id=xxx
    public async HttpGetName() {
        try {
            const response = await axios.default.get(this._http + "/getname?Id=" + this._id);
        } catch (exception) {
            process.stderr.write(`ERROR received from ${this._http}: ${exception}\n`);
        }
    }

    // /getroom?Id=xxx
    public async HttpGetRoom() {
        try {
            const response = await axios.default.get(this._http + "/getroom?Id=" + this._id);
            this._token = response.data.Token;
            this.InitWS();
            console.log(response.data);
        } catch (exception) {
            process.stderr.write(`ERROR received from ${this._http}: ${exception}\n`);
        }
    }

}


