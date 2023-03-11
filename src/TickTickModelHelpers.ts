export class TickTickModelHelpers {
    static ConvertDateToTickTickDateTime(date: Date): string {
        let dateString = date.toISOString();        
        return dateString.replace('Z', '+0000');
    }
}