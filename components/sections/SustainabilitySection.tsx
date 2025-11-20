import React from 'react';
import { VisualizerRef } from '../VisualizerCanvas';
import BlogArticleSection from './BlogArticleSection';
import { BLOG_CONTENT, VISUALIZER_PROFILES } from '../../constants';

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const SustainabilitySection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const articles = BLOG_CONTENT.sustainability.map((item, i) => ({
        ...item,
        icon: '∞',
        category: 'FUTURE',
        date: `Signal ${String(i + 1).padStart(2, '0')}`,
        tags: ['AI', 'Ethics', 'Future', 'Society']
    }));

    return (
        <BlogArticleSection
            visualizerRef={visualizerRef}
            sectionTitle="Future"
            sectionSubtitle="Signals & Predictions"
            sectionIcon="∞"
            articles={articles}
            accentColor="#00B8D4"
            visualizerParams={VISUALIZER_PROFILES.sustainability}
        />
    );
};

export default SustainabilitySection;
