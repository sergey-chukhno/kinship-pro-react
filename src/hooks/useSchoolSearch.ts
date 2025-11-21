import { useState, useEffect, useCallback, useRef } from 'react'
import { getSchools } from '../api/RegistrationRessource'

export interface School {
    id: number
    name: string
    city?: string
    zip_code?: string
    status?: string
    school_type?: string
}

interface UseSchoolSearchReturn {
    schools: School[]
    loading: boolean
    error: string | null
    hasMore: boolean
    searchQuery: string
    setSearchQuery: (query: string) => void
    loadMore: () => void
    reset: () => void
    scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Custom hook for school search with infinite scroll and debouncing
 * @param initialPerPage - Number of schools to load per page (default: 20)
 * @returns School search state and methods
 */
export function useSchoolSearch(initialPerPage = 20): UseSchoolSearchReturn {
    const [schools, setSchools] = useState<School[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)

    // Debounced search query
    const [debouncedQuery, setDebouncedQuery] = useState('')

    // Ref for scroll container
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Debounce search query (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery)
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery])

    // Fetch schools from API
    const fetchSchools = useCallback(async (pageNum: number, query: string, append = false) => {
        setLoading(true)
        setError(null)

        try {
            const params: any = {
                page: pageNum,
                per_page: initialPerPage,
                status: 'confirmed' // Only show confirmed schools
            }

            // Add search parameter if query exists
            if (query && query.trim()) {
                params.search = query.trim()
            }

            const response = await getSchools(params)
            const data = response?.data?.data ?? response?.data?.schools ?? response?.data ?? []

            if (Array.isArray(data)) {
                const normalized = data.map((s: any) => ({
                    id: Number(s.id),
                    name: s.name || '',
                    city: s.city || '',
                    zip_code: s.zip_code || '',
                    status: s.status || '',
                    school_type: s.school_type || ''
                }))

                if (append) {
                    setSchools(prev => [...prev, ...normalized])
                } else {
                    setSchools(normalized)
                }

                // Check if there are more results
                setHasMore(normalized.length === initialPerPage)
            } else {
                setSchools([])
                setHasMore(false)
            }
        } catch (err) {
            console.error('Error fetching schools:', err)
            setError('Erreur lors du chargement des écoles')
            setSchools([])
            setHasMore(false)
        } finally {
            setLoading(false)
        }
    }, [initialPerPage])

    // Reset and fetch when debounced search query changes
    useEffect(() => {
        setPage(1)
        setSchools([])
        setHasMore(true)
        fetchSchools(1, debouncedQuery, false)
    }, [debouncedQuery, fetchSchools])

    // Load more schools (for infinite scroll)
    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            const nextPage = page + 1
            setPage(nextPage)
            fetchSchools(nextPage, debouncedQuery, true)
        }
    }, [loading, hasMore, page, debouncedQuery, fetchSchools])

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
        setPage(1)
        setSchools([])
        setHasMore(true)
        setError(null)
    }, [])

    return {
        schools,
        loading,
        error,
        hasMore,
        searchQuery,
        setSearchQuery,
        loadMore,
        reset,
        scrollContainerRef
    }
}
