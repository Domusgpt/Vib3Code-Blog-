import React from 'react';
import { VisualizerRef } from '../VisualizerCanvas';
import BlogArticleSection from './BlogArticleSection';
import { BLOG_CONTENT, VISUALIZER_PROFILES } from '../../constants';

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const PillarsSection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const articles = BLOG_CONTENT.pillars.map((item, i) => ({
        ...item,
        title: item.title,
        category: 'TECH',
        date: `Stack ${String(i + 1).padStart(2, '0')}`,
        tags: ['WebGL', 'React', 'Performance', 'GPU']
    }));

    return (
        <BlogArticleSection
            visualizerRef={visualizerRef}
            sectionTitle="The Stack"
            sectionSubtitle="React / Three / GPU"
            sectionIcon="⬡"
            articles={articles}
            accentColor="#00E676"
            visualizerParams={VISUALIZER_PROFILES.pillars}
        />
    );
};

export default PillarsSection;
