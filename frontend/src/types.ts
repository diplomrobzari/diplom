export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type Tag = {
  id: number;
  name: string;
  slug: string;
};

export type Competition = {
  id: number;
  title: string;
  description?: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  starts_at: string;
  ends_at?: string | null;
  max_participants: number;
  current_participants: number;
  status: string;
  custom_category?: string | null;
  category?: Category | null;
  category_name?: string | null;
  tags: Tag[];
  tag_names?: string[];
  creator?: User;
  moderation_comment?: string | null;
  deleted_at?: string | null;
};

export type User = {
  id: number;
  name: string;
  surname?: string | null;
  patronymic?: string | null;
  username?: string | null;
  email: string;
  birth_date?: string | null;
  city?: string | null;
  bio?: string | null;
  is_admin?: boolean;
  is_banned?: boolean;
  avatar_url?: string | null;
  avatar_frame_key?: string | null;
  profile_background_key?: string | null;
  avatar_frame_asset_path?: string | null;
  profile_background_asset_path?: string | null;
  two_factor_enabled?: boolean;
  competitions_count?: number;
  participations_count?: number;
  created_at?: string;
  organizer_rating_avg?: number | null;
  organizer_reviews_count?: number;
  reviews_received?: OrganizerReview[];
  reviews_authored?: OrganizerReview[];
};

export type Participation = {
  id: number;
  status: string;
  place?: number | null;
  score?: string | null;
  result_note?: string | null;
  competition?: Competition;
  user?: User;
  deleted_at?: string | null;
};

export type OrganizerReview = {
  id: number;
  competition_id: number;
  organizer_id: number;
  reviewer_id: number;
  rating: number;
  comment?: string | null;
  organizer_reply?: string | null;
  organizer_replied_at?: string | null;
  competition?: Competition;
  organizer?: User;
  reviewer?: User;
  created_at: string;
  updated_at: string;
};

export type PaginatedOrganizerReviews = {
  data: OrganizerReview[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type Achievement = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  threshold: number;
};

export type UserAchievement = {
  id: number;
  user_id: number;
  achievement_id: number;
  level: number;
  progress: number;
  achievement?: Achievement;
};

export type ProfileCustomizationItem = {
  key: string;
  name: string;
  required_tasks: number;
  asset_path: string;
  is_unlocked: boolean;
};

export type ProfileCustomizationOptions = {
  completed_tasks: number;
  selected: {
    avatar_frame_key?: string | null;
    profile_background_key?: string | null;
  };
  avatar_frames: ProfileCustomizationItem[];
  profile_backgrounds: ProfileCustomizationItem[];
};

export type AdminProfileCustomizationItem = {
  id: number;
  type: "frame" | "background";
  name: string;
  required_tasks: number;
  asset_path: string;
};

export type SiteNotification = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PaginatedNotifications = {
  data: SiteNotification[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};
