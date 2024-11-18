export class TickTickModelHelpers {
    static ConvertDateToTickTickDateTime(date: Date): string {
        const dateString = date.toISOString();        
        return dateString.replace('Z', '+0000');
    }
}