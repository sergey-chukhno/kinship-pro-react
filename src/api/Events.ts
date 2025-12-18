import apiClient from './config';

// Types for Event API
export interface EventFormData {
  title: string;
  description?: string;
  date: string;                    // YYYY-MM-DD
  time: string;                    // HH:MM
  duration: number;                // minutes
  type: 'meeting' | 'workshop' | 'training' | 'celebration' | 'session' | 'other';
  location?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  badges?: string[];
  participants?: string[];         // Peut être combiné avec csv_file
}

export interface CreateEventPayload {
  event: EventFormData;
  image?: File;
  csv_file?: File;
}

export interface EventResponse {
  id: number;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  location?: string;
  status: string;
  badges?: number[];
  participants?: number[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface EventsListResponse {
  data: EventResponse[];
  meta?: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}

/**
 * Create an event for a school
 */
export const createSchoolEvent = async (
  schoolId: number,
  payload: CreateEventPayload
): Promise<EventResponse> => {
  const formData = new FormData();

  // Add event data
  const { event } = payload;
  formData.append('event[title]', event.title);
  if (event.description) {
    formData.append('event[description]', event.description);
  }
  formData.append('event[date]', event.date);
  formData.append('event[time]', event.time);
  formData.append('event[duration]', event.duration.toString());
  formData.append('event[type]', event.type);
  if (event.location) {
    formData.append('event[location]', event.location);
  }
  if (event.status) {
    formData.append('event[status]', event.status);
  }

  // Add badges if provided
  if (event.badges && event.badges.length > 0) {
    event.badges.forEach((badgeId, index) => {
      formData.append(`event[badges][${index}]`, badgeId);
    });
  }

  // Add participants if provided (and no CSV file)
  if (event.participants && event.participants.length > 0 && !payload.csv_file) {
    event.participants.forEach((participantId, index) => {
      formData.append(`event[participants][${index}]`, participantId);
    });
  }

  // Add image if provided (must be a File object)
  if (payload.image && payload.image instanceof File) {
    formData.append('image', payload.image);
  }

  // Add CSV file if provided (must be a File object)
  if (payload.csv_file && payload.csv_file instanceof File) {
    formData.append('csv_file', payload.csv_file);
  }

  const response = await apiClient.post(
    `/api/v1/schools/${schoolId}/events`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data.data || response.data;
};

/**
 * Create an event for a company
 */
export const createCompanyEvent = async (
  companyId: number,
  payload: CreateEventPayload
): Promise<EventResponse> => {
  const formData = new FormData();

  // Add event data
  const { event } = payload;
  formData.append('event[title]', event.title);
  if (event.description) {
    formData.append('event[description]', event.description);
  }
  formData.append('event[date]', event.date);
  formData.append('event[time]', event.time);
  formData.append('event[duration]', event.duration.toString());
  formData.append('event[type]', event.type);
  if (event.location) {
    formData.append('event[location]', event.location);
  }
  if (event.status) {
    formData.append('event[status]', event.status);
  }

  // Add badges if provided
  if (event.badges && event.badges.length > 0) {
    event.badges.forEach((badgeId, index) => {
      formData.append(`event[badges][${index}]`, badgeId);
    });
  }

  // Add participants if provided (and no CSV file)
  if (event.participants && event.participants.length > 0 && !payload.csv_file) {
    event.participants.forEach((participantId, index) => {
      formData.append(`event[participants][${index}]`, participantId);
    });
  }

  // Add image if provided (must be a File object)
  if (payload.image && payload.image instanceof File) {
    formData.append('image', payload.image);
  }

  // Add CSV file if provided (must be a File object)
  if (payload.csv_file && payload.csv_file instanceof File) {
    formData.append('csv_file', payload.csv_file);
  }

  const response = await apiClient.post(
    `/api/v1/companies/${companyId}/events`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data.data || response.data;
};

/**
 * Create an event for a teacher
 */
export const createTeacherEvent = async (
  payload: CreateEventPayload
): Promise<EventResponse> => {
  const formData = new FormData();

  // Add event data
  const { event } = payload;
  formData.append('event[title]', event.title);
  if (event.description) {
    formData.append('event[description]', event.description);
  }
  formData.append('event[date]', event.date);
  formData.append('event[time]', event.time);
  formData.append('event[duration]', event.duration.toString());
  formData.append('event[type]', event.type);
  if (event.location) {
    formData.append('event[location]', event.location);
  }
  if (event.status) {
    formData.append('event[status]', event.status);
  }

  // Add badges if provided
  if (event.badges && event.badges.length > 0) {
    event.badges.forEach((badgeId, index) => {
      formData.append(`event[badges][${index}]`, badgeId);
    });
  }

  // Add participants if provided (and no CSV file)
  if (event.participants && event.participants.length > 0 && !payload.csv_file) {
    event.participants.forEach((participantId, index) => {
      formData.append(`event[participants][${index}]`, participantId);
    });
  }

  // Add image if provided (must be a File object)
  if (payload.image && payload.image instanceof File) {
    formData.append('image', payload.image);
  }

  // Add CSV file if provided (must be a File object)
  if (payload.csv_file && payload.csv_file instanceof File) {
    formData.append('csv_file', payload.csv_file);
  }

  const response = await apiClient.post(
    '/api/v1/teachers/events',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data.data || response.data;
};

/**
 * Get events for a school
 */
export const getSchoolEvents = async (
  schoolId: number,
  params?: {
    page?: number;
    per_page?: number;
    status?: string;
    type?: string;
  }
): Promise<EventsListResponse> => {
  const response = await apiClient.get(
    `/api/v1/schools/${schoolId}/events`,
    {
      params: {
        page: params?.page || 1,
        per_page: params?.per_page || 1000,
        ...(params?.status && { status: params.status }),
        ...(params?.type && { type: params.type })
      }
    }
  );

  // Handle both paginated and non-paginated responses
  if (response.data.data && Array.isArray(response.data.data)) {
    return {
      data: response.data.data,
      meta: response.data.meta
    };
  }
  
  // If response is directly an array
  if (Array.isArray(response.data)) {
    return {
      data: response.data
    };
  }

  return {
    data: []
  };
};

/**
 * Get events for a company
 */
export const getCompanyEvents = async (
  companyId: number,
  params?: {
    page?: number;
    per_page?: number;
    status?: string;
    type?: string;
  }
): Promise<EventsListResponse> => {
  const response = await apiClient.get(
    `/api/v1/companies/${companyId}/events`,
    {
      params: {
        page: params?.page || 1,
        per_page: params?.per_page || 1000,
        ...(params?.status && { status: params.status }),
        ...(params?.type && { type: params.type })
      }
    }
  );

  // Handle both paginated and non-paginated responses
  if (response.data.data && Array.isArray(response.data.data)) {
    return {
      data: response.data.data,
      meta: response.data.meta
    };
  }
  
  // If response is directly an array
  if (Array.isArray(response.data)) {
    return {
      data: response.data
    };
  }

  return {
    data: []
  };
};

/**
 * Get events for a teacher
 */
export const getTeacherEvents = async (
  params?: {
    page?: number;
    per_page?: number;
    status?: string;
    type?: string;
  }
): Promise<EventsListResponse> => {
  const response = await apiClient.get(
    '/api/v1/teachers/events',
    {
      params: {
        page: params?.page || 1,
        per_page: params?.per_page || 1000,
        ...(params?.status && { status: params.status }),
        ...(params?.type && { type: params.type })
      }
    }
  );

  // Handle both paginated and non-paginated responses
  if (response.data.data && Array.isArray(response.data.data)) {
    return {
      data: response.data.data,
      meta: response.data.meta
    };
  }
  
  // If response is directly an array
  if (Array.isArray(response.data)) {
    return {
      data: response.data
    };
  }

  return {
    data: []
  };
};
