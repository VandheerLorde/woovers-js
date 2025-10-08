export type Refund = {
id: number;
refund_correlationID: string;
value: number;
status: string;
endToEndId: string;
time: string;
comment?: string;
charge_correlationID: string;
}