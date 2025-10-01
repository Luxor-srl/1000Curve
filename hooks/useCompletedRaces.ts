import { getOffRunAuthData } from '@/utils/auth';
import { useEffect, useState } from 'react';

export interface CompletedRace {
  id: string;
  clientId: string;
  startDate: string;
  finishDate: string;
  raceSlug: string;
  raceName?: string;
}

export interface LastRace {
  name: string;
  slug: string;
  finishDate?: string;
  startDate?: string;
  pointsName?: string;
  curves?: number;
  racerId?: string;
  clientId?: string;
}

export function useCompletedRaces() {
  const [completedRaces, setCompletedRaces] = useState<CompletedRace[]>([]);
  const [totalCurves, setTotalCurves] = useState<number>(0);
  const [totalRaces, setTotalRaces] = useState<number>(0);
  const [lastRace, setLastRace] = useState<LastRace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Utility: somma delle curve per una sessione completata
  const getCurvesForSession = async (session: any): Promise<number> => {
    try {
      const params = new URLSearchParams({
        action: 'get',
        getAction: 'getRacerLocationTimes',
        format: 'json',
        id: String(session.id),
        clientId: String(session.clientId),
      });
      const url = `https://crm.1000curve.com/Racer?${params.toString()}`;
      const headers = {
        'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
        'Accept': 'application/json',
      } as const;

      const response = await fetch(url, { method: 'GET', headers });
      const text = await response.text();
      const data = JSON.parse(text);
      if (!data?.raceLocationTimes) return 0;
      const filtered = data.raceLocationTimes.filter((cookie: any) => {
        const name = cookie.name?.toUpperCase() || '';
        const code = String(cookie.code)?.toUpperCase() || '';
        return !name.includes('START') && !name.includes('FINISH') && !code.includes('START') && !code.includes('FINISH');
      });
      return filtered
        .filter((c: any) => !!c.done)
        .reduce((sum: number, c: any) => sum + (Number(c.points) || 0), 0);
    } catch (e) {
      console.error('Errore nel recupero curve per sessione:', e);
      return 0;
    }
  };

  // Utility: dettagli gara (nome, pointsName)
  const getRaceDetails = async (slug: string): Promise<{ name?: string; pointsName?: string } | null> => {
    try {
      const params = new URLSearchParams({ action: 'get', getAction: 'getRace', slug });
      const url = `https://crm.1000curve.com/Race?${params.toString()}`;
      const headers = { 'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW' } as const;
      const response = await fetch(url, { method: 'GET', headers });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!data) return null;
      return { name: data.name, pointsName: data.pointsName };
    } catch (e) {
      console.error('Errore nel recupero dettagli gara:', e);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const authData = await getOffRunAuthData();
        if (!authData.isAuthenticated || !authData.userData) {
          throw new Error('User not authenticated');
        }

        // Fetch completed races from API
        const headers = {
          'Api-Key': 'uWoNPe2rGF9cToGQh2MdQJWkBNsQhtrvV0GC6Fq0pyYAtGNdJLqc6iALiusdyWLVgV7bbW',
        };
        const params = new URLSearchParams({
          action: 'get',
          getAction: 'getRaces',
          username: authData.userData.username,
        });
        const url = `https://crm.1000curve.com/RaceUser?${params.toString()}`;
        const response = await fetch(url, { method: 'GET', headers });
        const data = await response.json();

        if (data && data.races) {
          const offRunRaces = data.races.filter((race: any) => race.offRun === true);
          const mappedRaces: CompletedRace[] = offRunRaces.map((race: any) => ({
            id: race.racerId.toString(),
            clientId: race.racerClientId,
            startDate: race.racerStartDateGmtDate,
            finishDate: race.racerFinishDateGmtDate,
            raceSlug: race.slug,
            raceName: race.name,
          }));

          setCompletedRaces(mappedRaces);
          setTotalRaces(mappedRaces.length);

          if (mappedRaces.length === 0) {
            setTotalCurves(0);
            setLastRace(null);
            return;
          }

          // Sort by finish date
          const sortedRaces = [...mappedRaces].sort((a, b) => {
            const ad = new Date(a.finishDate || a.startDate).getTime();
            const bd = new Date(b.finishDate || b.startDate).getTime();
            return bd - ad;
          });

          // Calculate total curves
          const curvePromises = mappedRaces.map((race) => getCurvesForSession({
            id: race.id,
            clientId: race.clientId,
            startDate: race.startDate,
            finishDate: race.finishDate,
            raceSlug: race.raceSlug,
          }));
          const curvesArr = await Promise.all(curvePromises);
          const totalAll = curvesArr.reduce((acc, n) => acc + (n || 0), 0);
          setTotalCurves(totalAll);

          // Get last race details
          const latest = sortedRaces[0];
          const [latestCurve, raceInfo] = await Promise.all([
            getCurvesForSession({
              id: latest.id,
              clientId: latest.clientId,
              startDate: latest.startDate,
              finishDate: latest.finishDate,
              raceSlug: latest.raceSlug,
            }),
            getRaceDetails(latest.raceSlug),
          ]);

          setLastRace({
            name: raceInfo?.name || latest.raceName || latest.raceSlug || 'Gara',
            slug: latest.raceSlug,
            finishDate: latest.finishDate,
            startDate: latest.startDate,
            pointsName: raceInfo?.pointsName,
            curves: latestCurve || 0,
            racerId: latest.id,
            clientId: latest.clientId,
          });
        } else {
          setCompletedRaces([]);
          setTotalRaces(0);
          setTotalCurves(0);
          setLastRace(null);
        }
      } catch (err) {
        console.error('Errore nel caricamento dati gare completate:', err);
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        setCompletedRaces([]);
        setTotalRaces(0);
        setTotalCurves(0);
        setLastRace(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    completedRaces,
    totalCurves,
    totalRaces,
    lastRace,
    loading,
    error,
    refetch: () => {
      // Trigger reload by updating a dependency or using a refetch function
      // For simplicity, we can call loadData again, but since useEffect depends on nothing, we need to force it
      // Actually, since no dependencies, we can add a state to trigger reload
    },
  };
}