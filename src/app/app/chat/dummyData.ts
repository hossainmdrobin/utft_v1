export interface User {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'me' | 'them';
  date: string;
}

export const currentUser: User = {
  id: 'me',
  name: 'You',
  avatar: 'https://i.pravatar.cc/40?img=12',
  online: true,
};

export const chatPartner: User = {
  id: 'bot',
  name: 'AI Assistant',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=assistant',
  online: true,
};

export const initialMessages: Message[] = [
  { id: '1', text: 'Hey! Are you free this weekend?', timestamp: '9:12 AM', sender: 'them', date: 'Yesterday' },
  { id: '2', text: 'Hey Alex! Yeah, mostly free. What did you have in mind?', timestamp: '9:14 AM', sender: 'me', date: 'Yesterday' },
  { id: '3', text: 'Thinking of grabbing coffee at the new place downtown.', timestamp: '9:15 AM', sender: 'them', date: 'Yesterday' },
  { id: '4', text: 'That sounds great. Saturday morning work for you?', timestamp: '9:17 AM', sender: 'me', date: 'Yesterday' },
  { id: '5', text: "Perfect. Let's say 10am?", timestamp: '9:18 AM', sender: 'them', date: 'Yesterday' },
  { id: '6', text: "Deal. I'll send the address.", timestamp: '9:20 AM', sender: 'me', date: 'Yesterday' },
  { id: '7', text: 'Just landed. Traffic was brutal today.', timestamp: '8:45 AM', sender: 'them', date: 'Today' },
  { id: '8', text: 'Rough! Did you make it to the meeting on time?', timestamp: '8:47 AM', sender: 'me', date: 'Today' },
  { id: '9', text: 'Barely. Slid in right as it started.', timestamp: '8:48 AM', sender: 'them', date: 'Today' },
  { id: '10', text: 'Glad you made it. See you Saturday!', timestamp: '8:50 AM', sender: 'me', date: 'Today' },
];
