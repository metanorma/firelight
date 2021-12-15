// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useEffect, useMemo, useState, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import ContentSection from './ContentSection';
import Cover from './Cover';
import { getChildsById } from '../utility';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    contentSections: any[];
    index: number;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainContent({ contentSections, index }: OwnProps) {
    let location = useLocation();
    const [page, setPage] = useState(index);
    const [start, setStart] = useState(index);
    const [end, setEnd] = useState(index);
    const [contents, setContents] = useState<any[]>([]);
    const [isScroll, setIsScroll] = useState<boolean>(false);

    const loaderStart = useRef<HTMLDivElement | null>(null);
    const loaderEnd = useRef<HTMLDivElement | null>(null);
    // here we handle what happens when user scrolls to Load More div
    // in this case we just update page variable
    const handleObserver = (entities: any) => {
        if (entities.length > 1) return;
        const target = entities[0];
        if (target.isIntersecting  && end < contentSections.length  && start > -1) {
            setIsScroll(true);
            if (target.target.getAttribute('class') === 'load-end') {
                setEnd((prev) => prev + 1);
            } 
            if (target.target.getAttribute('class') === 'load-start') {
                setStart((prev) => prev - 1);
            }
        }
    };

    useEffect(() => {
        setPage(start);
    }, [start])

    useEffect(() => {
        setPage(end);
    }, [end])

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '20px',
            threshold: 1.0
        };
        // initialize IntersectionObserver and attaching to Load More div
        const observer = new IntersectionObserver(handleObserver, options);
        if (loaderStart.current) {
            observer.observe(loaderStart.current);
        }
        if (loaderEnd.current) {
            observer.observe(loaderEnd.current);
        }
    }, []);

    useEffect(() => {
        if (contentSections?.length && !contents[page]) {
            if (contents.length === 0) {
                const arr: any = [];
                arr[page] = contentSections[page];
                if (page === 2 || page === 3) {
                    arr[page + 1] = contentSections[page + 1];
                    arr[page + 2] = contentSections[page + 2];
                }
                setContents(arr);
            }
            else if (page > -1 && page < contentSections.length) {
                const newContent = contents;
                if (isScroll) {
                    newContent[page] = contentSections[page];
                    if (page === 2 || page === 3) {
                        newContent[page + 1] = contentSections[page + 1];
                        newContent[page + 2] = contentSections[page + 2];
                    }
                    setContents(newContent);
                } else {
                    // if (!newContent[page - 1]) newContent[page - 1] = contentSections[page - 1];
                    if (!newContent[page]) newContent[page] = contentSections[page];
                    // if (!newContent[page + 1]) newContent[page + 1] = contentSections[page + 1];
                    setContents(newContent);
                }
            }
        }
    }, [page, contentSections]);
    console.log(page, contents);
    return (
        <div className="main-page">
            {page <= 0 && <Cover />}
            <div ref={loaderStart} className="load-start"></div>
            {contents?.length > 0 &&
                contents.map((item: any) =>
                    item?.data ? (
                        <ContentSection xmlData={item.data} key={item.index} />
                    ) : (
                        <></>
                    )
                )}
            <div ref={loaderEnd} className="load-end"></div>
        </div>
    );
}
