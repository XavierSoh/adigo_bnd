-- =====================================================
-- SEED: Event Categories
-- =====================================================

INSERT INTO event_category (name, name_fr, name_en, icon, color, display_order) VALUES
('music', 'Musique', 'Music', 'music_note', '#E91E63', 1),
('concert', 'Concert', 'Concert', 'mic', '#9C27B0', 2),
('festival', 'Festival', 'Festival', 'celebration', '#673AB7', 3),
('sport', 'Sport', 'Sport', 'sports_soccer', '#4CAF50', 4),
('theater', 'Théâtre', 'Theater', 'theater_comedy', '#FF9800', 5),
('cinema', 'Cinéma', 'Cinema', 'movie', '#795548', 6),
('comedy', 'Humour', 'Comedy', 'sentiment_very_satisfied', '#FFC107', 7),
('conference', 'Conférence', 'Conference', 'groups', '#607D8B', 8),
('workshop', 'Atelier', 'Workshop', 'build', '#00BCD4', 9),
('exhibition', 'Exposition', 'Exhibition', 'palette', '#3F51B5', 10),
('party', 'Soirée', 'Party', 'nightlife', '#F44336', 11),
('networking', 'Networking', 'Networking', 'handshake', '#009688', 12),
('religious', 'Religieux', 'Religious', 'church', '#8D6E63', 13),
('charity', 'Caritatif', 'Charity', 'volunteer_activism', '#E91E63', 14),
('food', 'Gastronomie', 'Food & Drinks', 'restaurant', '#FF5722', 15),
('kids', 'Enfants', 'Kids', 'child_care', '#CDDC39', 16),
('education', 'Éducation', 'Education', 'school', '#2196F3', 17),
('business', 'Business', 'Business', 'business_center', '#455A64', 18),
('health', 'Santé', 'Health & Wellness', 'favorite', '#4CAF50', 19),
('other', 'Autre', 'Other', 'category', '#9E9E9E', 20)
ON CONFLICT (name) DO NOTHING;
