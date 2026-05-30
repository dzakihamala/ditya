export interface Meeting {
  id: string;
  eventName: string;
  dates: string[];
  startHour: number;
  endHour: number;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingInput {
  eventName: string;
  dates: string[];
  startHour: number;
  endHour: number;
}
