import { useState, useEffect, useCallback, useRef } from 'react'

export interface Entity {
    id: number
    name: string
    city?: string
    zip_code?: string
    company_type?: any
    [key: string]: any
}

interface UseClientSideSearchReturn {
    filteredEntities: Entity[]
    displayedEntities: Entity[]
    loading: boolean
    error: string | null
    searchQuery: string
    setSearchQuery: (query: string) => void
    scrollContainerRef: React.RefObject<HTMLDivElement | null>
    hasMore: boolean
    reset: () => void
}

interface UseClientSideSearchOptions {
    fetchFunction: () => Promise<any>
    searchFields?: string[]  // Fields to search in (default: ['name'])
    itemsPerPage?: number    // Items to display per page (default: 20)
    debounceMs?: number      // Debounce delay in ms (default: 300)
}

/**
 * Custom hook for client-side search with infinite scroll
 * Fetches all data once, then filters and paginates client-side
 * 
 * @param options - Configuration options
 * @returns Search state and methods
 */
export function useClientSideSearch(options: UseClientSideSearchOptions): UseClientSideSearchReturn {
    const {
        fetchFunction,
        searchFields = ['name'],
        itemsPerPage = 20,
        debounceMs = 300
    } = options

    // All entities from API
    const [allEntities, setAllEntities] = useState<Entity[]>([])

    // UI state
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [displayCount, setDisplayCount] = useState(itemsPerPage)

    // Ref for scroll container
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery)
            setDisplayCount(itemsPerPage) // Reset display count on new search
        }, debounceMs)

        return () => clearTimeout(timer)
    }, [searchQuery, debounceMs, itemsPerPage])

    // Fetch all entities once on mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)

            try {
                const response = await fetchFunction()
                const data = response?.data?.data ?? response?.data ?? response ?? []

                if (Array.isArray(data)) {
                    const normalized = data.map((item: any) => ({
                        id: Number(item.id),
                        name: item.name || '',
                        city: item.city || '',
                        zip_code: item.zip_code || '',
                        company_type: item.company_type || null,
                        ...item // Include all other fields
                    }))
                    setAllEntities(normalized)
                } else {
                    setAllEntities([])
                }
            } catch (err) {
                console.error('Error fetching entities:', err)
                setError('Erreur lors du chargement des données')
                setAllEntities([])
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [fetchFunction])

    // Filter entities based on search query
    const filteredEntities = useCallback(() => {
        if (!debouncedQuery.trim()) {
            return allEntities
        }

        const query = debouncedQuery.toLowerCase()

        return allEntities.filter((entity) => {
            return searchFields.some((field) => {
                const value = entity[field]
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(query)
                }
                return false
            })
        })
    }, [allEntities, debouncedQuery, searchFields])()

    // Entities to display (paginated)
    const displayedEntities = filteredEntities.slice(0, displayCount)

    // Check if there are more entities to load
    const hasMore = displayCount < filteredEntities.length

    // Load more entities
    const loadMore = useCallback(() => {
        if (hasMore) {
            setDisplayCount(prev => prev + itemsPerPage)
        }
    }, [hasMore, itemsPerPage])

    // Infinite scroll handler
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container

            // Load more when scrolled to bottom (with 50px threshold)
            if (scrollHeight - scrollTop - clientHeight < 50) {
                loadMore()
            }
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [loadMore])

    // Reset search
    const reset = useCallback(() => {
        setSearchQuery('')
        setDebouncedQuery('')
        setDisplayCount(itemsPerPage)
        setError(null)
    }, [itemsPerPage])

    return {
        filteredEntities,
        displayedEntities,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        scrollContainerRef,
        hasMore,
        reset
    }
}
