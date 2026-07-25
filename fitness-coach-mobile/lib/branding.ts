import { useAuth } from './auth';
import { useClientByProfile, useProfileById } from './queries';

// Eğitmen kendi işletme adını girdiyse danışanına ve kendisine "Coachbook" yerine o gösterilir.
// Danışan tarafında antrenörün profilini bir adım daha çekmek gerekiyor (ayarlar.tsx'teki
// trainerProfileQuery ile aynı desen).
export function useBrandName(): string {
  const { profile } = useAuth();
  const isTrainer = profile?.role === 'trainer';
  const ownClientQuery = useClientByProfile(!isTrainer ? profile?.id : undefined);
  const trainerProfileQuery = useProfileById(!isTrainer ? ownClientQuery.data?.trainer_id : undefined);

  if (isTrainer) return profile?.brand_name?.trim() || 'Coachbook';
  return trainerProfileQuery.data?.brand_name?.trim() || 'Coachbook';
}
