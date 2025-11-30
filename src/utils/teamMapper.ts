import { Team, CreateTeamPayload, TeamMember } from '../api/Projects';

/**
 * Map API team data to frontend team format
 */
export const mapApiTeamToFrontendTeam = (apiTeam: Team): any => {
    return {
        id: apiTeam.id.toString(),
        name: apiTeam.title,
        description: apiTeam.description,
        chiefId: apiTeam.team_leader?.id?.toString() || '',
        members: apiTeam.team_members?.map((tm: TeamMember) => tm.user?.id?.toString()) || [],
        number: 0 // Will be calculated based on order
    };
};

/**
 * Extract numeric ID from various formats (e.g., "owner-188" -> 188, "188" -> 188)
 */
const extractNumericId = (id: string | number | undefined | null): number | null => {
    if (!id) return null;
    
    const idStr = id.toString().trim();
    if (idStr === '') return null;
    
    // Handle formats like "owner-188", "co-owner-123", etc.
    const match = idStr.match(/(\d+)$/);
    if (match) {
        const parsed = parseInt(match[1]);
        return isNaN(parsed) ? null : parsed;
    }
    
    // Try direct parsing
    const parsed = parseInt(idStr);
    return isNaN(parsed) ? null : parsed;
};

/**
 * Map frontend team format to backend API payload
 */
export const mapFrontendTeamToBackend = (frontendTeam: any): CreateTeamPayload => {
    // Parse chiefId - handle formats like "owner-188", "188", etc.
    const team_leader_id = extractNumericId(frontendTeam.chiefId) || undefined;
    
    // Parse member IDs - handle formats like "owner-188", "188", etc.
    const team_member_ids = (frontendTeam.members || [])
        .map((id: string | number) => extractNumericId(id))
        .filter((id: number | null) => id !== null) as number[];
    
    return {
        title: frontendTeam.name,
        description: frontendTeam.description,
        team_leader_id: team_leader_id,
        team_member_ids: team_member_ids
    };
};

