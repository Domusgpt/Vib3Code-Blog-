import React from 'react';
import { VisualizerRef } from '../VisualizerCanvas';
import BlogArticleSection from './BlogArticleSection';
import { BLOG_CONTENT, VISUALIZER_PROFILES } from '../../constants';

interface SectionProps {
    visualizerRef: React.RefObject<VisualizerRef | null>;
}

const QualitySection: React.FC<SectionProps> = ({ visualizerRef }) => {
    const articles = BLOG_CONTENT.quality.map((item, i) => ({
        ...item,
        icon: '✦',
        date: `${8 + i} min read`,
        tags: ['Tutorial', 'Deep Dive', 'Architecture', 'Performance']
    }));

    return (
        <BlogArticleSection
            visualizerRef={visualizerRef}
            sectionTitle="Deep Dives"
            sectionSubtitle="Technical Case Studies"
            sectionIcon="✦"
            articles={articles}
            accentColor="#FF6D00"
            visualizerParams={VISUALIZER_PROFILES.quality}
        />
    );
};

export default QualitySection;
