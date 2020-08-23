import { EnemyMgr, Player } from "./playerController";

declare var TokenMsg: (arg0: number) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var MoveMsg: (arg0: number) => string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;
declare var blob2string: (arg0: any) => string;

export class Web {
    private _ip: string = "192.168.98.89:9001";
    private _ws!: WebSocket;
    private _pmap!: EnemyMgr;
    private _me!: Player;
    private _timerCmd: NodeJS.Timeout | null = null;
    private _isStart: boolean = false;

    constructor() {
    }

    public IsGameStart(): boolean {
        return this._isStart;
    }
   
    public UpdateP(p: EnemyMgr, m: Player) {
        this._me = m;
        this._pmap = p;
        this._timerCmd = setInterval((me) => {
            if (typeof (me) == 'undefined')
                return;

            if (me.isMove())
                this.SendMoveMsg(me.getDirect());
        }, 20, this._me);
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
                this._isStart = true;
                if (typeof (this._me) == 'undefined' || typeof (this._pmap) == 'undefined')
                    return;

                this._me.mUpdate(data.users[0].X, data.users[0].Y, data.users[0].Hp);
                if (data.users.length > 1) {
                    for (var i = 1; i < data.users.length; i++) {
                        var tt = data.users[i];
                        if (tt.Id == data.users[0].Id)
                            continue;
                        this._pmap.Add(tt.Id, tt.X, tt.Y, tt.Hp);
                    }
                }
            }
            if (typeof (data.outter) != 'undefined') {

            }
            if (typeof (data.time) != 'undefined') {

            }
            if (typeof (data.bullets) != 'undefined' && data.bullets != null) {

            }

            if (typeof (data.bullets) != 'undefined' && data.bullets == null) {

            }
            if (typeof (data.end) != 'undefined') {

            }
        };

        this._ws.onclose = () => {
            clearInterval(Number(this._timerCmd));
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

}
