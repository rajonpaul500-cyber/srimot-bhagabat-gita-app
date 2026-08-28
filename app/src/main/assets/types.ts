
export interface Chapter {
  id: string;
  title: string;
  pdfUrl: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  chapters: Chapter[];
  altChapters?: Chapter[];
}

export interface SavedNote {
  id: string;
  text: string;
  date: string;
}

export type ViewState = 'splash' | 'subjects' | 'chapters' | 'content' | 'tools';
export type GuideMode = 'guide' | 'altGuide';
export type ToolSubView = 'note' | 'timer' | 'vaishnavCalendar';
