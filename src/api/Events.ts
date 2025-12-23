import apiClient from './config';

// Types for Event API
export interface EventFormData {
  title: string;
  description?: string;
  date: string;                    // YYYY-MM-DD
  time: string;                    // HH:MM
  duration: number;                // minutes
  type: 'meeting' | 'workshop' | 'training' | 'session' | 'other';
  location?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  badges?: string[];
  participants?: string[];         // Peut être combiné avec csv_file
}

export interface CreateEventPayload {
  event: EventFormData;
  image?: File;
  csv_file?: File;
  documents?: File[];
}

export interface EventParticipantResponse {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
  claim_token?: string | null;
  has_event_badges?: boolean;
  received_badge_ids?: string[];
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
  participants?: EventParticipantResponse[];
  image?: string;
  created_at: string;
  updated_at: string;
  documents?: any[];
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
  const { event } = payload;
  const hasFiles =
    (payload.image && payload.image instanceof File) ||
    (payload.csv_file && payload.csv_file instanceof File) ||
    (payload.documents && payload.documents.length > 0);

  // Debug: Log payload
  console.log('createSchoolEvent - payload:', {
    event: event,
    hasImage: !!payload.image,
    hasCsv: !!payload.csv_file,
    hasFiles: hasFiles
  });

  // If no files, use JSON format
  if (!hasFiles) {
    // Prepare JSON payload
    const jsonPayload: any = {
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        duration: event.duration,
        type: event.type,
        status: event.status || 'upcoming'
      }
    };

    if (event.description) {
      jsonPayload.event.description = event.description;
    }
    if (event.location) {
      jsonPayload.event.location = event.location;
    }
    if (event.badges && event.badges.length > 0) {
      jsonPayload.event.badges = event.badges;
    }
    if (event.participants && event.participants.length > 0) {
      // Convert participant IDs to strings
      jsonPayload.event.participants = event.participants.map((participantId: string | number): string => {
        return typeof participantId === 'string' ? participantId : String(participantId);
      });
    }

    console.log('createSchoolEvent - JSON payload:', jsonPayload);

    const response = await apiClient.post(
      `/api/v1/schools/${schoolId}/events`,
      jsonPayload
    );

    return response.data.data || response.data;
  }

  // If files present, use FormData
  const formData = new FormData();

  // Debug: Log event data
  console.log('createSchoolEvent - FormData mode');
  console.log('event.participants:', event.participants);
  console.log('event.participants type:', typeof event.participants);
  console.log('event.participants length:', event.participants?.length);

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
    event.badges.forEach((badgeId) => {
      formData.append('event[badges][]', badgeId);
    });
  }

  // Add participants if provided
  // Send as array with empty brackets: event[participants][]=80, event[participants][]=81
  console.log('Checking participants for FormData:', {
    hasParticipants: !!event.participants,
    participantsLength: event.participants?.length,
    participants: event.participants
  });
  
  if (event.participants && event.participants.length > 0) {
    console.log('Adding participants to FormData:', event.participants);
    event.participants.forEach((participantId) => {
      const participantIdStr = typeof participantId === 'string' ? participantId : String(participantId);
      console.log('Appending participant:', participantIdStr);
      formData.append('event[participants][]', participantIdStr);
    });
  } else {
    console.log('No participants to add - event.participants is:', event.participants);
  }

  // Add image if provided (must be a File object)
  if (payload.image && payload.image instanceof File) {
    formData.append('image', payload.image);
  }

  // Add documents if provided
  if (payload.documents && payload.documents.length > 0) {
    payload.documents.forEach((file) => {
      if (file instanceof File) {
        formData.append('documents[]', file);
      }
    });
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
  const { event } = payload;
  const hasFiles =
    (payload.image && payload.image instanceof File) ||
    (payload.csv_file && payload.csv_file instanceof File) ||
    (payload.documents && payload.documents.length > 0);

  // If no files, use JSON format
  if (!hasFiles) {
    // Prepare JSON payload
    const jsonPayload: any = {
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        duration: event.duration,
        type: event.type,
        status: event.status || 'upcoming'
      }
    };

    if (event.description) {
      jsonPayload.event.description = event.description;
    }
    if (event.location) {
      jsonPayload.event.location = event.location;
    }
    if (event.badges && event.badges.length > 0) {
      jsonPayload.event.badges = event.badges;
    }
    if (event.participants && event.participants.length > 0) {
      // Convert participant IDs to strings
      jsonPayload.event.participants = event.participants.map((participantId: string | number): string => {
        return typeof participantId === 'string' ? participantId : String(participantId);
      });
    }

    const response = await apiClient.post(
      `/api/v1/companies/${companyId}/events`,
      jsonPayload
    );

    return response.data.data || response.data;
  }

  // If files present, use FormData
  const formData = new FormData();

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
    event.badges.forEach((badgeId) => {
      formData.append('event[badges][]', badgeId);
    });
  }

  // Add participants if provided
  // Send as array with empty brackets: event[participants][]=80, event[participants][]=81
  if (event.participants && event.participants.length > 0) {
    event.participants.forEach((participantId) => {
      const participantIdStr = typeof participantId === 'string' ? participantId : String(participantId);
      formData.append('event[participants][]', participantIdStr);
    });
  }

  // Add image if provided (must be a File object)
  if (payload.image && payload.image instanceof File) {
    formData.append('image', payload.image);
  }

  // Add documents if provided
  if (payload.documents && payload.documents.length > 0) {
    payload.documents.forEach((file) => {
      if (file instanceof File) {
        formData.append('documents[]', file);
      }
    });
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
  const { event } = payload;
  const hasFiles =
    (payload.image && payload.image instanceof File) ||
    (payload.csv_file && payload.csv_file instanceof File) ||
    (payload.documents && payload.documents.length > 0);

  // If no files, use JSON format
  if (!hasFiles) {
    // Prepare JSON payload
    const jsonPayload: any = {
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        duration: event.duration,
        type: event.type,
        status: event.status || 'upcoming'
      }
    };

    if (event.description) {
      jsonPayload.event.description = event.description;
    }
    if (event.location) {
      jsonPayload.event.location = event.location;
    }
    if (event.badges && event.badges.length > 0) {
      jsonPayload.event.badges = event.badges;
    }
    if (event.participants && event.participants.length > 0) {
      // Convert participant IDs to strings
      jsonPayload.event.participants = event.participants.map((participantId: string | number): string => {
        return typeof participantId === 'string' ? participantId : String(participantId);
      });
    }

    const response = await apiClient.post(
      '/api/v1/teachers/events',
      jsonPayload
    );

    return response.data.data || response.data;
  }

  // If files present, use FormData
  const formData = new FormData();

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
    event.badges.forEach((badgeId) => {
      formData.append('event[badges][]', badgeId);
    });
  }

  // Add participants if provided
  // Send as array with empty brackets: event[participants][]=80, event[participants][]=81
  if (event.participants && event.participants.length > 0) {
    event.participants.forEach((participantId) => {
      const participantIdStr = typeof participantId === 'string' ? participantId : String(participantId);
      formData.append('event[participants][]', participantIdStr);
    });
  }

  // Add image if provided (must be a File object)
  if (payload.image && payload.image instanceof File) {
    formData.append('image', payload.image);
  }

  // Add documents if provided
  if (payload.documents && payload.documents.length > 0) {
    payload.documents.forEach((file) => {
      if (file instanceof File) {
        formData.append('documents[]', file);
      }
    });
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

/**
 * Get events for a personal user
 * Uses /api/v1/users/me/events endpoint
 * Supports filtering by status, type, start_date, organization_type, organization_id
 */
export const getUserEvents = async (
  params?: {
    page?: number;
    per_page?: number;
    status?: string;
    type?: string;
    start_date?: string;
    organization_type?: string;
    organization_id?: number;
  }
): Promise<EventsListResponse> => {
  const response = await apiClient.get(
    '/api/v1/users/me/events',
    {
      params: {
        page: params?.page || 1,
        per_page: params?.per_page || 1000,
        ...(params?.status && { status: params.status }),
        ...(params?.type && { type: params.type }),
        ...(params?.start_date && { start_date: params.start_date }),
        ...(params?.organization_type && { organization_type: params.organization_type }),
        ...(params?.organization_id && { organization_id: params.organization_id })
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
 * Delete an event for a school
 */
export const deleteSchoolEvent = async (
  schoolId: number,
  eventId: number
): Promise<void> => {
  await apiClient.delete(`/api/v1/schools/${schoolId}/events/${eventId}`);
};

/**
 * Delete an event for a company
 */
export const deleteCompanyEvent = async (
  companyId: number,
  eventId: number
): Promise<void> => {
  await apiClient.delete(`/api/v1/companies/${companyId}/events/${eventId}`);
};

/**
 * Delete an event for a teacher
 */
export const deleteTeacherEvent = async (
  eventId: number
): Promise<void> => {
  await apiClient.delete(`/api/v1/teachers/events/${eventId}`);
};

/**
 * Delete an event for a personal user
 */
export const deleteUserEvent = async (
  eventId: number
): Promise<void> => {
  await apiClient.delete(`/api/v1/users/events/${eventId}`);
};

/**
 * Update an event for a school
 */
export const updateSchoolEvent = async (
  schoolId: number,
  eventId: number,
  payload: CreateEventPayload
): Promise<EventResponse> => {
  const { event } = payload;
  const hasFiles =
    (payload.image && payload.image instanceof File) ||
    (payload.csv_file && payload.csv_file instanceof File) ||
    (payload.documents && payload.documents.length > 0);

  // If no files, use JSON format
  if (!hasFiles) {
    // Prepare JSON payload
    const jsonPayload: any = {
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        duration: event.duration,
        type: event.type,
        status: event.status || 'upcoming'
      }
    };

    if (event.description) {
      jsonPayload.event.description = event.description;
    }
    if (event.location) {
      jsonPayload.event.location = event.location;
    }
    if (event.badges && event.badges.length > 0) {
      jsonPayload.event.badges = event.badges;
    }
    if (event.participants && event.participants.length > 0) {
      // Convert participant IDs to strings
      jsonPayload.event.participants = event.participants.map((participantId: string | number): string => {
        return typeof participantId === 'string' ? participantId : String(participantId);
      });
    }

    const response = await apiClient.put(
      `/api/v1/schools/${schoolId}/events/${eventId}`,
      jsonPayload
    );

    return response.data.data || response.data;
  }

  // If files present, use FormData
  const formData = new FormData();

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
    event.badges.forEach((badgeId) => {
      formData.append('event[badges][]', badgeId);
    });
  }

  // Add participants if provided
  // Send as array with empty brackets: event[participants][]=80, event[participants][]=81
  if (event.participants && event.participants.length > 0) {
    event.participants.forEach((participantId) => {
      const participantIdStr = typeof participantId === 'string' ? participantId : String(participantId);
      formData.append('event[participants][]', participantIdStr);
    });
  }

  // Add image if provided (must be a File object)
  if (payload.image && payload.image instanceof File) {
    formData.append('image', payload.image);
  }

  // Add documents if provided
  if (payload.documents && payload.documents.length > 0) {
    payload.documents.forEach((file) => {
      if (file instanceof File) {
        formData.append('documents[]', file);
      }
    });
  }

  // Add CSV file if provided (must be a File object)
  if (payload.csv_file && payload.csv_file instanceof File) {
    formData.append('csv_file', payload.csv_file);
  }

  const response = await apiClient.put(
    `/api/v1/schools/${schoolId}/events/${eventId}`,
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
 * Update an event for a company
 */
export const updateCompanyEvent = async (
  companyId: number,
  eventId: number,
  payload: CreateEventPayload
): Promise<EventResponse> => {
  const { event } = payload;
  const hasFiles = (payload.image && payload.image instanceof File) || 
                   (payload.csv_file && payload.csv_file instanceof File);

  // If no files, use JSON format
  if (!hasFiles) {
    // Prepare JSON payload
    const jsonPayload: any = {
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        duration: event.duration,
        type: event.type,
        status: event.status || 'upcoming'
      }
    };

    if (event.description) {
      jsonPayload.event.description = event.description;
    }
    if (event.location) {
      jsonPayload.event.location = event.location;
    }
    if (event.badges && event.badges.length > 0) {
      jsonPayload.event.badges = event.badges;
    }
    if (event.participants && event.participants.length > 0) {
      // Convert participant IDs to strings
      jsonPayload.event.participants = event.participants.map((participantId: string | number): string => {
        return typeof participantId === 'string' ? participantId : String(participantId);
      });
    }

    const response = await apiClient.put(
      `/api/v1/companies/${companyId}/events/${eventId}`,
      jsonPayload
    );

    return response.data.data || response.data;
  }

  // If files present, use FormData
  const formData = new FormData();

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
    event.badges.forEach((badgeId) => {
      formData.append('event[badges][]', badgeId);
    });
  }

  // Add participants if provided
  // Send as array with empty brackets: event[participants][]=80, event[participants][]=81
  if (event.participants && event.participants.length > 0) {
    event.participants.forEach((participantId) => {
      const participantIdStr = typeof participantId === 'string' ? participantId : String(participantId);
      formData.append('event[participants][]', participantIdStr);
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

  const response = await apiClient.put(
    `/api/v1/companies/${companyId}/events/${eventId}`,
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
 * Update an event for a teacher
 */
export const updateTeacherEvent = async (
  eventId: number,
  payload: CreateEventPayload
): Promise<EventResponse> => {
  const { event } = payload;
  const hasFiles = (payload.image && payload.image instanceof File) || 
                   (payload.csv_file && payload.csv_file instanceof File);

  // If no files, use JSON format
  if (!hasFiles) {
    // Prepare JSON payload
    const jsonPayload: any = {
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        duration: event.duration,
        type: event.type,
        status: event.status || 'upcoming'
      }
    };

    if (event.description) {
      jsonPayload.event.description = event.description;
    }
    if (event.location) {
      jsonPayload.event.location = event.location;
    }
    if (event.badges && event.badges.length > 0) {
      jsonPayload.event.badges = event.badges;
    }
    if (event.participants && event.participants.length > 0) {
      // Convert participant IDs to strings
      jsonPayload.event.participants = event.participants.map((participantId: string | number): string => {
        return typeof participantId === 'string' ? participantId : String(participantId);
      });
    }

    const response = await apiClient.put(
      `/api/v1/teachers/events/${eventId}`,
      jsonPayload
    );

    return response.data.data || response.data;
  }

  // If files present, use FormData
  const formData = new FormData();

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
    event.badges.forEach((badgeId) => {
      formData.append('event[badges][]', badgeId);
    });
  }

  // Add participants if provided
  // Send as array with empty brackets: event[participants][]=80, event[participants][]=81
  if (event.participants && event.participants.length > 0) {
    event.participants.forEach((participantId) => {
      const participantIdStr = typeof participantId === 'string' ? participantId : String(participantId);
      formData.append('event[participants][]', participantIdStr);
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

  const response = await apiClient.put(
    `/api/v1/teachers/events/${eventId}`,
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
 * Create an event for a personal user
 */
export const createUserEvent = async (
  payload: CreateEventPayload
): Promise<EventResponse> => {
  const { event } = payload;
  const hasFiles = (payload.image && payload.image instanceof File) || 
                   (payload.csv_file && payload.csv_file instanceof File);

  // If no files, use JSON format
  if (!hasFiles) {
    // Prepare JSON payload
    const jsonPayload: any = {
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        duration: event.duration,
        type: event.type,
        status: event.status || 'upcoming'
      }
    };

    if (event.description) {
      jsonPayload.event.description = event.description;
    }
    if (event.location) {
      jsonPayload.event.location = event.location;
    }
    if (event.badges && event.badges.length > 0) {
      jsonPayload.event.badges = event.badges;
    }
    if (event.participants && event.participants.length > 0) {
      // Convert participant IDs to strings
      jsonPayload.event.participants = event.participants.map((participantId: string | number): string => {
        return typeof participantId === 'string' ? participantId : String(participantId);
      });
    }

    const response = await apiClient.post(
      '/api/v1/users/events',
      jsonPayload
    );

    return response.data.data || response.data;
  }

  // If files present, use FormData
  const formData = new FormData();

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
    event.badges.forEach((badgeId) => {
      formData.append('event[badges][]', badgeId);
    });
  }

  // Add participants if provided
  if (event.participants && event.participants.length > 0) {
    event.participants.forEach((participantId) => {
      const participantIdStr = typeof participantId === 'string' ? participantId : String(participantId);
      formData.append('event[participants][]', participantIdStr);
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
    '/api/v1/users/events',
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
 * Update an event for a personal user
 */
export const updateUserEvent = async (
  eventId: number,
  payload: CreateEventPayload
): Promise<EventResponse> => {
  const { event } = payload;
  const hasFiles = (payload.image && payload.image instanceof File) || 
                   (payload.csv_file && payload.csv_file instanceof File);

  // If no files, use JSON format
  if (!hasFiles) {
    // Prepare JSON payload
    const jsonPayload: any = {
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        duration: event.duration,
        type: event.type,
        status: event.status || 'upcoming'
      }
    };

    if (event.description) {
      jsonPayload.event.description = event.description;
    }
    if (event.location) {
      jsonPayload.event.location = event.location;
    }
    if (event.badges && event.badges.length > 0) {
      jsonPayload.event.badges = event.badges;
    }
    if (event.participants && event.participants.length > 0) {
      // Convert participant IDs to strings
      jsonPayload.event.participants = event.participants.map((participantId: string | number): string => {
        return typeof participantId === 'string' ? participantId : String(participantId);
      });
    }

    const response = await apiClient.put(
      `/api/v1/users/events/${eventId}`,
      jsonPayload
    );

    return response.data.data || response.data;
  }

  // If files present, use FormData
  const formData = new FormData();

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
    event.badges.forEach((badgeId) => {
      formData.append('event[badges][]', badgeId);
    });
  }

  // Add participants if provided
  if (event.participants && event.participants.length > 0) {
    event.participants.forEach((participantId) => {
      const participantIdStr = typeof participantId === 'string' ? participantId : String(participantId);
      formData.append('event[participants][]', participantIdStr);
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

  const response = await apiClient.put(
    `/api/v1/users/events/${eventId}`,
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
 * Complete an event and assign badges to participants
 */
export interface CompleteEventPayload {
  assignments: Array<{
    participant_id: number;
    badge_id: number;
    proof?: File; // Optional proof file for level 2, 3, 4 badges
    comment?: string; // Optional comment
  }>;
}

/**
 * Complete a school event
 */
export const completeSchoolEvent = async (
  schoolId: number,
  eventId: number,
  payload: CompleteEventPayload
): Promise<any> => {
  // Check if any assignment has a proof file
  const hasFiles = payload.assignments.some(assignment => assignment.proof instanceof File);
  
  if (hasFiles) {
    // Use FormData for file upload
    const formData = new FormData();
    
    payload.assignments.forEach((assignment, index) => {
      formData.append(`assignments[${index}][participant_id]`, assignment.participant_id.toString());
      formData.append(`assignments[${index}][badge_id]`, assignment.badge_id.toString());
      if (assignment.proof instanceof File) {
        formData.append(`assignments[${index}][proof]`, assignment.proof);
      }
      if (assignment.comment) {
        formData.append(`assignments[${index}][comment]`, assignment.comment);
      }
    });
    
    const response = await apiClient.post(
      `/api/v1/schools/${schoolId}/events/${eventId}/complete`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data || response.data;
  } else {
    // Use JSON for regular requests
    const response = await apiClient.post(
      `/api/v1/schools/${schoolId}/events/${eventId}/complete`,
      payload
    );
    return response.data.data || response.data;
  }
};

/**
 * Complete a company event
 */
export const completeCompanyEvent = async (
  companyId: number,
  eventId: number,
  payload: CompleteEventPayload
): Promise<any> => {
  // Check if any assignment has a proof file
  const hasFiles = payload.assignments.some(assignment => assignment.proof instanceof File);
  
  if (hasFiles) {
    // Use FormData for file upload
    const formData = new FormData();
    
    payload.assignments.forEach((assignment, index) => {
      formData.append(`assignments[${index}][participant_id]`, assignment.participant_id.toString());
      formData.append(`assignments[${index}][badge_id]`, assignment.badge_id.toString());
      if (assignment.proof instanceof File) {
        formData.append(`assignments[${index}][proof]`, assignment.proof);
      }
      if (assignment.comment) {
        formData.append(`assignments[${index}][comment]`, assignment.comment);
      }
    });
    
    const response = await apiClient.post(
      `/api/v1/companies/${companyId}/events/${eventId}/complete`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data || response.data;
  } else {
    // Use JSON for regular requests
    const response = await apiClient.post(
      `/api/v1/companies/${companyId}/events/${eventId}/complete`,
      payload
    );
    return response.data.data || response.data;
  }
};

/**
 * Complete a teacher event
 */
export const completeTeacherEvent = async (
  eventId: number,
  payload: CompleteEventPayload
): Promise<any> => {
  // Check if any assignment has a proof file
  const hasFiles = payload.assignments.some(assignment => assignment.proof instanceof File);
  
  if (hasFiles) {
    // Use FormData for file upload
    const formData = new FormData();
    
    payload.assignments.forEach((assignment, index) => {
      formData.append(`assignments[${index}][participant_id]`, assignment.participant_id.toString());
      formData.append(`assignments[${index}][badge_id]`, assignment.badge_id.toString());
      if (assignment.proof instanceof File) {
        formData.append(`assignments[${index}][proof]`, assignment.proof);
      }
      if (assignment.comment) {
        formData.append(`assignments[${index}][comment]`, assignment.comment);
      }
    });
    
    const response = await apiClient.post(
      `/api/v1/teachers/events/${eventId}/complete`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data || response.data;
  } else {
    // Use JSON for regular requests
    const response = await apiClient.post(
      `/api/v1/teachers/events/${eventId}/complete`,
      payload
    );
    return response.data.data || response.data;
  }
};

/**
 * Complete a personal user event
 */
export const completeUserEvent = async (
  eventId: number,
  payload: CompleteEventPayload
): Promise<any> => {
  // Check if any assignment has a proof file
  const hasFiles = payload.assignments.some(assignment => assignment.proof instanceof File);
  
  if (hasFiles) {
    // Use FormData for file upload
    const formData = new FormData();
    
    payload.assignments.forEach((assignment, index) => {
      formData.append(`assignments[${index}][participant_id]`, assignment.participant_id.toString());
      formData.append(`assignments[${index}][badge_id]`, assignment.badge_id.toString());
      if (assignment.proof instanceof File) {
        formData.append(`assignments[${index}][proof]`, assignment.proof);
      }
      if (assignment.comment) {
        formData.append(`assignments[${index}][comment]`, assignment.comment);
      }
    });
    
    const response = await apiClient.post(
      `/api/v1/users/events/${eventId}/complete`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data || response.data;
  } else {
    // Use JSON for regular requests
    const response = await apiClient.post(
      `/api/v1/users/events/${eventId}/complete`,
      payload
    );
    return response.data.data || response.data;
  }
};

/**
 * Remove a participant from a school event
 */
export const removeSchoolEventParticipant = async (
  schoolId: number,
  eventId: number,
  participantId: number
): Promise<any> => {
  const response = await apiClient.delete(
    `/api/v1/schools/${schoolId}/events/${eventId}/participants/${participantId}`
  );
  return response.data.data || response.data;
};

/**
 * Remove a participant from a company event
 */
export const removeCompanyEventParticipant = async (
  companyId: number,
  eventId: number,
  participantId: number
): Promise<any> => {
  const response = await apiClient.delete(
    `/api/v1/companies/${companyId}/events/${eventId}/participants/${participantId}`
  );
  return response.data.data || response.data;
};

/**
 * Remove a participant from a teacher event
 */
export const removeTeacherEventParticipant = async (
  eventId: number,
  participantId: number
): Promise<any> => {
  const response = await apiClient.delete(
    `/api/v1/teachers/events/${eventId}/participants/${participantId}`
  );
  return response.data.data || response.data;
};

/**
 * Remove a participant from a personal user event
 */
export const removeUserEventParticipant = async (
  eventId: number,
  participantId: number
): Promise<any> => {
  const response = await apiClient.delete(
    `/api/v1/users/events/${eventId}/participants/${participantId}`
  );
  return response.data.data || response.data;
};
