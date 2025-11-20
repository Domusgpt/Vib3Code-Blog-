import React from 'react';
import { VisualizerRef } from '../VisualizerCanvas';
import BlogArticleSection from './BlogArticleSection';
import { BLOG_CONTENT, VISUALIZER_PROFILES } from '../../constants';

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const PhilosophySection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const articles = BLOG_CONTENT.philosophy.map((item, i) => ({
        ...item,
        icon: '★',
        category: 'CONCEPT',
        date: `Entry ${String(i + 1).padStart(2, '0')}`,
        tags: ['AI', 'Theory', 'Ethics', 'UX']
    }));

    return (
        <BlogArticleSection
            visualizerRef={visualizerRef}
            sectionTitle="Concepts"
            sectionSubtitle="AI Theory & Ethics"
            sectionIcon="★"
            articles={articles}
            accentColor="#F50057"
            visualizerParams={VISUALIZER_PROFILES.philosophy}
        />
    );
};

export default PhilosophySection;
