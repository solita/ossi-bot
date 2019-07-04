export type Size = 'SMALL' | 'MEDIUM' | 'LARGE' | 'COMPETENCE_DEVELOPMENT';
export type Status = 'INITIAL' | 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type Contribution = {
    id: string;
    timestamp: number;
    username: string;
    privateChannel: string;
    size: Size;
    status: Status;
    text: string;
}
