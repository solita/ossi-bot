export type Size = 'SMALL' | 'MEDIUM' | 'NO';
export type Status = 'INITIAL' | 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type Contribution = {
    id: string;
    sequence: number;
    username: string;
    privateChannel: string;
    size: Size;
    status: Status;
    text: string;

}
