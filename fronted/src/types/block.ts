export interface Challenge {
  id: number;
  title: string;
  description?: string;
  // Add other challenge fields as needed
}

export interface Block {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_private: boolean;
  challenges?: Challenge[];
  challenges_count?: number;
}

export interface BlockFormProps {
  block?: Block;
  onSaved: () => void;
}

export interface BlockItemProps {
  block: Block;
  onEditSaved: () => void;
  onDelete: () => void;
  onOpenQuestions: (block: Block) => void;
}

export interface SelectChallengesModalProps {
  block: Block;
  onClose: () => void;
  onSaved: () => void;
}
