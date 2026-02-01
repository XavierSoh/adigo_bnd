-- =====================================================
-- ADIGO TICKETING - SEED EVENT CATEGORIES
-- Version: 1.0.0
-- Description: Initial event categories with translations
-- =====================================================

INSERT INTO event_category (name, name_en, name_fr, description_en, description_fr, icon, color, is_active, display_order)
VALUES
    -- 1. Music & Concerts
    ('Music & Concerts',
     'Music & Concerts',
     'Musique & Concerts',
     'Live music performances, concerts, and music festivals',
     'Concerts, spectacles musicaux et festivals de musique',
     'music',
     '#E91E63',
     TRUE,
     1),

    -- 2. Theater & Performing Arts
    ('Theater & Arts',
     'Theater & Performing Arts',
     'Théâtre & Arts de la Scène',
     'Theater plays, dance performances, and stage shows',
     'Pièces de théâtre, spectacles de danse et représentations scéniques',
     'theater',
     '#9C27B0',
     TRUE,
     2),

    -- 3. Sports Events
    ('Sports',
     'Sports Events',
     'Événements Sportifs',
     'Football matches, basketball games, and sporting competitions',
     'Matchs de football, basketball et compétitions sportives',
     'sports_soccer',
     '#4CAF50',
     TRUE,
     3),

    -- 4. Cinema & Movies
    ('Cinema',
     'Cinema & Movies',
     'Cinéma & Films',
     'Movie premieres, film screenings, and cinema events',
     'Premières de films, projections et événements cinématographiques',
     'local_movies',
     '#FF5722',
     TRUE,
     4),

    -- 5. Conferences & Seminars
    ('Conferences',
     'Conferences & Seminars',
     'Conférences & Séminaires',
     'Professional conferences, business seminars, and workshops',
     'Conférences professionnelles, séminaires d''affaires et ateliers',
     'business',
     '#2196F3',
     TRUE,
     5),

    -- 6. Training & Education
    ('Training',
     'Training & Education',
     'Formation & Éducation',
     'Educational workshops, training sessions, and skill development',
     'Ateliers éducatifs, sessions de formation et développement de compétences',
     'school',
     '#FFC107',
     TRUE,
     6),

    -- 7. Comedy & Entertainment
    ('Comedy',
     'Comedy & Entertainment',
     'Comédie & Divertissement',
     'Stand-up comedy shows, entertainment events, and comedy festivals',
     'Spectacles d''humour, événements de divertissement et festivals de comédie',
     'emoji_emotions',
     '#FF9800',
     TRUE,
     7),

    -- 8. Exhibitions & Fairs
    ('Exhibitions',
     'Exhibitions & Fairs',
     'Expositions & Foires',
     'Art exhibitions, trade fairs, and cultural displays',
     'Expositions d''art, foires commerciales et présentations culturelles',
     'museum',
     '#795548',
     TRUE,
     8),

    -- 9. Food & Drink
    ('Food & Drink',
     'Food & Drink Events',
     'Gastronomie & Boissons',
     'Food festivals, wine tastings, and culinary events',
     'Festivals gastronomiques, dégustations de vin et événements culinaires',
     'restaurant',
     '#F44336',
     TRUE,
     9),

    -- 10. Nightlife & Parties
    ('Nightlife',
     'Nightlife & Parties',
     'Vie Nocturne & Fêtes',
     'Club nights, parties, DJ sets, and nightlife events',
     'Soirées club, fêtes, sets DJ et événements nocturnes',
     'nightlife',
     '#673AB7',
     TRUE,
     10),

    -- 11. Religious & Spiritual
    ('Religious',
     'Religious & Spiritual',
     'Religieux & Spirituel',
     'Religious gatherings, spiritual events, and worship services',
     'Rassemblements religieux, événements spirituels et services de culte',
     'church',
     '#607D8B',
     TRUE,
     11),

    -- 12. Kids & Family
    ('Kids & Family',
     'Kids & Family Events',
     'Enfants & Famille',
     'Family-friendly events, kids shows, and children activities',
     'Événements familiaux, spectacles pour enfants et activités pour enfants',
     'child_care',
     '#00BCD4',
     TRUE,
     12),

    -- 13. Fashion & Beauty
    ('Fashion',
     'Fashion & Beauty',
     'Mode & Beauté',
     'Fashion shows, beauty pageants, and style events',
     'Défilés de mode, concours de beauté et événements de style',
     'checkroom',
     '#E91E63',
     TRUE,
     13),

    -- 14. Technology & Innovation
    ('Technology',
     'Technology & Innovation',
     'Technologie & Innovation',
     'Tech conferences, hackathons, and innovation summits',
     'Conférences technologiques, hackathons et sommets de l''innovation',
     'computer',
     '#3F51B5',
     TRUE,
     14),

    -- 15. Charity & Fundraising
    ('Charity',
     'Charity & Fundraising',
     'Charité & Collecte de Fonds',
     'Charity galas, fundraising events, and social causes',
     'Galas de charité, événements de collecte de fonds et causes sociales',
     'volunteer_activism',
     '#009688',
     TRUE,
     15),

    -- 16. Networking & Social
    ('Networking',
     'Networking & Social',
     'Réseautage & Social',
     'Professional networking, meetups, and social gatherings',
     'Réseautage professionnel, rencontres et rassemblements sociaux',
     'groups',
     '#03A9F4',
     TRUE,
     16),

    -- 17. Cultural & Traditional
    ('Cultural',
     'Cultural & Traditional',
     'Culturel & Traditionnel',
     'Cultural festivals, traditional ceremonies, and heritage events',
     'Festivals culturels, cérémonies traditionnelles et événements patrimoniaux',
     'celebration',
     '#FF6F00',
     TRUE,
     17),

    -- 18. Health & Wellness
    ('Health & Wellness',
     'Health & Wellness',
     'Santé & Bien-être',
     'Health seminars, fitness events, and wellness workshops',
     'Séminaires de santé, événements de fitness et ateliers de bien-être',
     'spa',
     '#4CAF50',
     TRUE,
     18),

    -- 19. Literary & Books
    ('Literary',
     'Literary & Books',
     'Littérature & Livres',
     'Book launches, literary festivals, and author meet-and-greets',
     'Lancements de livres, festivals littéraires et rencontres avec auteurs',
     'menu_book',
     '#8D6E63',
     TRUE,
     19),

    -- 20. Other Events
    ('Other',
     'Other Events',
     'Autres Événements',
     'Miscellaneous events that don''t fit other categories',
     'Événements divers qui ne correspondent pas aux autres catégories',
     'more_horiz',
     '#9E9E9E',
     TRUE,
     20)

ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- VERIFY INSERTION
-- =====================================================

DO $$
DECLARE
    category_count INT;
BEGIN
    SELECT COUNT(*) INTO category_count FROM event_category;
    RAISE NOTICE 'Total event categories inserted/updated: %', category_count;
END $$;

-- =====================================================
-- CREATE DEFAULT EVENT ORGANIZER (FOR TESTING)
-- =====================================================

-- Note: This assumes customer with ID 1 exists
-- Adjust or remove if not applicable for production

INSERT INTO event_organizer (
    customer_id,
    organization_name,
    organization_type,
    email,
    phone,
    address,
    city,
    country,
    description_en,
    description_fr,
    verification_status,
    is_verified
)
VALUES (
    1,  -- Replace with actual customer ID for testing
    'Adigo Events Demo',
    'company',
    'demo@adigo.cm',
    '+237 6 XX XX XX XX',
    'Douala, Cameroon',
    'Douala',
    'Cameroon',
    'Demo event organizer for testing purposes',
    'Organisateur d''événements démo pour tests',
    'verified',
    TRUE
)
ON CONFLICT (customer_id) DO NOTHING;

-- =====================================================
-- END OF SEED DATA
-- =====================================================
