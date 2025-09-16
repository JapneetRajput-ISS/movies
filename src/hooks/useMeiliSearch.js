import { useState, useEffect, useRef } from "react";

export default function useMeiliSearch(query, options) {
    const host = import.meta.env.VITE_MEILI_HOST;
    const apiKey = import.meta.env.VITE_MEILI_KEY;

    const { index, limit = 100, facets, filters } = options;
    const [results, setResults] = useState([]);
    const [facetDistribution, setFacetDistribution] = useState({});
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [estimatedTotalHits, setEstimatedTotalHits] = useState(undefined);
    const debounceTimeout = useRef(null);
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    // Create document function
    async function createDocument(newDoc) {
        try {
            console.debug('[MeiliSearch] createDocument called with:', newDoc);
            const response = await fetch(`${host}/indexes/${index}/documents`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify([newDoc]),
            });
            console.debug('[MeiliSearch] POST response status:', response.status);
            if (!response.ok) throw new Error("Failed to create document");
            requery();
            const result = await response.json();
            console.debug('[MeiliSearch] POST response JSON:', result);
            return result;
        } catch (e) {
            console.error('[MeiliSearch] createDocument error:', e);
            setError(e);
            throw e;
        }
    }

    // Delete document function
    async function deleteDocument(id) {
        try {
            console.debug('[MeiliSearch] deleteDocument called with id:', id);
            const response = await fetch(`${host}/indexes/${index}/documents/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            });
            console.debug('[MeiliSearch] DELETE response status:', response.status);
            if (!response.ok) throw new Error("Failed to delete document");
            requery();
            return true;
        } catch (e) {
            console.error('[MeiliSearch] deleteDocument error:', e);
            setError(e);
            throw e;
        }
    }

    async function fetchResults(cancelled = false) {
        setLoading(true);
        setError(null);
        try {
            const body = {
                q: debouncedQuery,
                limit,
                attributesToHighlight: ["*"],
            };
            if (facets) body.facets = facets;
            if (filters) body.filter = filters;
            const response = await fetch(`${host}/indexes/${index}/search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!cancelled) {
                setResults(data.hits || []);
                setEstimatedTotalHits(data.estimatedTotalHits);
                setFacetDistribution(data.facetDistribution || {});
            }
        } catch (e) {
            if (!cancelled) setError(e);
            if (!cancelled) setResults([]);
            if (!cancelled) setEstimatedTotalHits(undefined);
            if (!cancelled) setFacetDistribution({});
        } finally {
            if (!cancelled) setLoading(false);
            if (!cancelled) setLoaded(true);
        }
    }

    // Debounce the query input
    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300); // 300ms debounce
        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        };
    }, [query]);

    // Prepare facets dependency for useEffect
    const facetsDep = facets ? JSON.stringify(facets) : undefined;
    useEffect(() => {
        let cancelled = false;

        fetchResults(cancelled);
        return () => {
            cancelled = true;
        };
    }, [host, apiKey, index, debouncedQuery, limit, facets, facetsDep, filters]);

    // Edit document function
    async function editDocument(updatedDoc) {
        try {
            console.debug('[MeiliSearch] editDocument called with:', updatedDoc);
            const response = await fetch(`${host}/indexes/${index}/documents`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify([updatedDoc]),
            });
            console.debug('[MeiliSearch] PUT response status:', response.status);
            if (!response.ok) throw new Error("Failed to update document");

            // Immediately refresh results after edit
            await fetchResults();
            const result = await response.json();
            console.debug('[MeiliSearch] PUT response JSON:', result);
            return result;
        } catch (e) {
            console.error('[MeiliSearch] editDocument error:', e);
            setError(e);
            throw e;
        }
    }

    // Expose a requery function to force refresh
    function requery() {
        fetchResults();
    }
    return { results, facetDistribution, loading, loaded, error, estimatedTotalHits, editDocument, deleteDocument, createDocument, requery };
}